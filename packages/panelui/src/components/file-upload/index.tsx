/**
 * FileUpload — pick files and photos, check them, and run their uploads.
 *
 * ```tsx
 * <FileUpload
 *   value={files}
 *   onValueChange={setFiles}
 *   sources={['camera', 'library', 'files']}
 *   accept={['image/*', 'application/pdf']}
 *   multiple
 *   maxFiles={5}
 *   maxSize={10 * 1024 * 1024}
 *   upload={(file, { signal, onProgress }) => send(file, { signal, onProgress })}
 * >
 *   <FileUpload.Dropzone />
 *   <FileUpload.List />
 * </FileUpload>
 * ```
 *
 * ## One component for the whole trip
 *
 * Choosing a document, choosing or taking a photo, and sending either of them
 * somewhere are one flow from the user's side: they add things, watch them go,
 * and fix the ones that failed. So the root owns all of it — the list of files,
 * the rules they have to pass, and the upload queue — and the parts are only
 * different ways of drawing that list. `Dropzone` and `Trigger` add to it,
 * `List` draws it as rows, `Grid` draws it as photo tiles, and `useFileUpload()`
 * hands the same state to anything drawn by hand.
 *
 * ## The upload belongs to the app
 *
 * The component never makes a request. `upload` is the app's function: it
 * receives one file, an `AbortSignal` and an `onProgress` callback, and
 * resolves when the server has the file. That keeps the storage provider, the
 * auth headers and the retry policy where they already live, and leaves the
 * component with the part every app repeats — running at most `concurrency`
 * at once, showing progress, and wiring cancel, retry and remove to the right
 * file. The status of every file lives in `value`, so a form can read whether
 * everything has finished without asking the component.
 *
 * ## Native modules are optional
 *
 * Each source reaches its Expo module only when it is used: `files` through
 * `expo-document-picker`, `camera` and `library` through `expo-image-picker`,
 * and resizing through `expo-image-manipulator`. An app that only takes
 * documents never installs the camera module. A source whose module is
 * missing reports an error with the install command rather than crashing.
 */
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Image,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import {
  CameraIcon,
  CheckCircleIcon,
  FileIcon,
  FolderIcon,
  ImageIcon,
  PlusIcon,
  RotateCcwIcon,
  TrashIcon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from '../../icons';
import { AnimatedPressable, type AnimatedPressableProps } from '../../primitives/animated-pressable';
import { useControllableState } from '../../primitives/controllable-state';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { Attachment, type AttachmentState } from '../attachment';
import { useFieldLabelledBy } from '../field';
import { ImageViewer } from '../image-viewer';
import { Menu } from '../menu';
import {
  createFileId,
  describeRules,
  extensionOf,
  fitWithin,
  formatFileSize,
  isActive,
  kindOf,
  libraryMediaTypes,
  nextToStart,
  partitionFiles,
  pickerTypes,
  truncateMiddle,
  type FileUploadFile,
  type FileUploadKind,
  type FileUploadRejection,
  type FileUploadSource,
  type FileUploadStatus,
} from './file-upload-core';
import type { ViewRef } from '../../primitives/refs';

export {
  describeRules as describeFileUploadRules,
  formatFileSize,
  type FileUploadFile,
  type FileUploadKind,
  type FileUploadRejection,
  type FileUploadSource,
  type FileUploadStatus,
};

// ---------------------------------------------------------------------------
// Optional dependencies
// ---------------------------------------------------------------------------

interface PickerAsset {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  type?: string | null;
}

interface PickerResult {
  canceled: boolean;
  assets?: PickerAsset[] | null;
}

interface ImagePickerModule {
  requestCameraPermissionsAsync(): Promise<{ granted: boolean }>;
  launchCameraAsync(options: unknown): Promise<PickerResult>;
  launchImageLibraryAsync(options: unknown): Promise<PickerResult>;
}

interface DocumentAsset {
  uri: string;
  name: string;
  size?: number | null;
  mimeType?: string | null;
}

interface DocumentPickerModule {
  getDocumentAsync(options: unknown): Promise<{ canceled: boolean; assets?: DocumentAsset[] | null }>;
}

interface ManipulatorContext {
  resize(size: { width?: number; height?: number }): ManipulatorContext;
  renderAsync(): Promise<{
    saveAsync(options: { format?: string; compress?: number }): Promise<{
      uri: string;
      width: number;
      height: number;
    }>;
  }>;
}

interface ManipulatorModule {
  ImageManipulator?: { manipulate(uri: string): ManipulatorContext };
}

/*
 * Each `require` sits directly in its `try` block, which is what lets Metro
 * bundle an app that does not have the package.
 */
function loadImagePicker(): ImagePickerModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-image-picker') as ImagePickerModule;
  } catch {
    return null;
  }
}

function loadDocumentPicker(): DocumentPickerModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-document-picker') as DocumentPickerModule;
  } catch {
    return null;
  }
}

function loadManipulator(): ManipulatorModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-image-manipulator') as ManipulatorModule;
  } catch {
    return null;
  }
}

const MODULE_FOR: Record<FileUploadSource, string> = {
  camera: 'expo-image-picker',
  library: 'expo-image-picker',
  files: 'expo-document-picker',
};

/** True when the module a source needs is installed. */
export function hasFileUploadSource(source: FileUploadSource): boolean {
  return source === 'files' ? loadDocumentPicker() !== null : loadImagePicker() !== null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** What the upload handler is given besides the file. */
export interface FileUploadHandlerContext {
  /** Aborted when the user cancels or removes the file. Pass it to `fetch`. */
  signal: AbortSignal;
  /** Report how far the upload is, 0–1. Calls are batched to one per frame. */
  onProgress: (progress: number) => void;
  /** Mark the bytes as sent and the server as still working on them. */
  setProcessing: () => void;
}

/**
 * Sends one file. Resolve when the server has it — the value is kept as the
 * file's `response` — and throw to mark it failed; the error's message is shown
 * on the row.
 */
export type FileUploadHandler = (
  file: FileUploadFile,
  context: FileUploadHandlerContext
) => Promise<unknown>;

/** How photos are prepared before they are added. */
export interface FileUploadImageOptions {
  /** Scale photos wider than this down to it. Needs `expo-image-manipulator`. */
  maxWidth?: number;
  /** Scale photos taller than this down to it. Needs `expo-image-manipulator`. */
  maxHeight?: number;
  /** JPEG quality 0–1, for the picker and for a resized copy. Default 0.9. */
  quality?: number;
  /**
   * Open the system's crop editor after a photo is chosen or taken, at this
   * aspect ratio. Applies to a single photo only — the editor cannot run over
   * a multiple selection. iOS crops to a square whatever the ratio.
   */
  crop?: { aspect: [number, number] };
}

export interface FileUploadProps {
  /** The files, controlled. */
  value?: FileUploadFile[];
  /** The files to start with, uncontrolled. */
  defaultValue?: FileUploadFile[];
  /** Called with the new list whenever a file is added, changes state or is removed. */
  onValueChange?: (files: FileUploadFile[]) => void;
  /**
   * Where files can come from, in the order the chooser lists them. One source
   * opens its picker straight away; more than one opens a sheet to choose from.
   * Default `['library', 'files']`.
   */
  sources?: FileUploadSource[];
  /**
   * Allowed types: MIME types (`application/pdf`), families (`image/*`) or
   * extensions (`.pdf`). Everything when left out.
   */
  accept?: string[];
  /**
   * Let the list hold more than one file. Without it the list holds one, and
   * picking again replaces it — the shape of a profile photo or a single
   * attachment field.
   */
  multiple?: boolean;
  /**
   * How many files the list can hold, with `multiple`. Pickers are limited to
   * what is left, and the add controls disable once it is reached.
   */
  maxFiles?: number;
  /**
   * Largest allowed file, in bytes. Checked against the size the picker
   * reports, after any resize; a file whose size is unknown passes.
   */
  maxSize?: number;
  /** Smallest allowed file, in bytes. */
  minSize?: number;
  /** An app-specific rule. Return a message to turn the file away. */
  validate?: (file: FileUploadFile) => string | null | undefined;
  /** Called with the files that were picked and turned away, and why. */
  onReject?: (rejections: FileUploadRejection[]) => void;
  /** Called when a picker cannot open — a missing module or a refused permission. */
  onError?: (error: Error) => void;
  /** Resize, compress or crop photos before they are added. */
  image?: FileUploadImageOptions;
  /** Sends one file. Without it files are only picked, and stay `idle`. */
  upload?: FileUploadHandler;
  /** How many uploads run at once. Default 2. */
  concurrency?: number;
  /**
   * Queue files for upload as soon as they are added. Default true. Turn it off
   * to send them later with `useFileUpload().upload()`.
   */
  autoUpload?: boolean;
  /** Called once per file when its upload resolves. */
  onUploadComplete?: (file: FileUploadFile) => void;
  /** Labels for the sources in the chooser. */
  sourceLabels?: Partial<Record<FileUploadSource, string>>;
  /** Nothing can be added, removed or retried. */
  disabled?: boolean;
  /** Draw the dropzone in its error state, for a form that failed validation. */
  invalid?: boolean;
  children?: ReactNode;
}

interface FileUploadContextValue {
  files: FileUploadFile[];
  sources: FileUploadSource[];
  sourceLabels: Record<FileUploadSource, string>;
  accept?: string[];
  maxFiles?: number;
  maxSize?: number;
  multiple: boolean;
  disabled: boolean;
  invalid: boolean;
  canAddMore: boolean;
  hasUpload: boolean;
  rejections: FileUploadRejection[];
  pick: (source: FileUploadSource) => Promise<void>;
  remove: (id: string) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  upload: (id?: string) => void;
  clear: () => void;
}

const FileUploadContext = createContext<FileUploadContextValue | null>(null);

/**
 * The state and actions of the nearest `FileUpload`, for drawing a part of it
 * by hand — a single avatar slot, a counter, a submit button that waits for
 * every upload.
 */
export function useFileUpload(): FileUploadContextValue {
  const context = useContext(FileUploadContext);
  if (!context) throw new Error('useFileUpload must be used inside <FileUpload>.');
  return context;
}

const DEFAULT_SOURCES: FileUploadSource[] = ['library', 'files'];

const DEFAULT_LABELS: Record<FileUploadSource, string> = {
  camera: 'Take photo',
  library: 'Choose from library',
  files: 'Browse files',
};

/** How long the chooser sheet takes to leave before a system picker opens over it. */
const CHOOSER_EXIT_MS = 320;

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function FileUploadRoot({
  value: valueProp,
  defaultValue = [],
  onValueChange,
  sources: sourcesProp = DEFAULT_SOURCES,
  accept,
  multiple = false,
  maxFiles: maxFilesProp,
  maxSize,
  minSize,
  validate,
  onReject,
  onError,
  image,
  upload: uploadHandler,
  concurrency = 2,
  autoUpload = true,
  onUploadComplete,
  sourceLabels,
  disabled = false,
  invalid = false,
  children,
}: FileUploadProps) {
  const maxFiles = multiple ? maxFilesProp : 1;
  const { value, setValue } = useControllableState<FileUploadFile[]>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });

  /*
   * The list as this component last wrote it. Uploads report several changes
   * inside one tick — a file starts, the next one queues, progress arrives —
   * and a controlled owner has not re-rendered between them, so building each
   * change on `value` would drop all but the last. Every change is built on
   * this ref instead, and the ref takes the owner's value whenever it changes.
   */
  const latest = useRef(value);
  const seen = useRef(value);
  if (value !== seen.current) {
    seen.current = value;
    latest.current = value;
  }

  const commit = useCallback(
    (change: (files: FileUploadFile[]) => FileUploadFile[]) => {
      const next = change(latest.current);
      if (next === latest.current) return;
      latest.current = next;
      setValue(next);
    },
    [setValue]
  );

  const patch = useCallback(
    (id: string, fields: Partial<FileUploadFile>) =>
      commit((files) =>
        files.some((file) => file.id === id)
          ? files.map((file) => (file.id === id ? { ...file, ...fields } : file))
          : files
      ),
    [commit]
  );

  const [rejections, setRejections] = useState<FileUploadRejection[]>([]);

  // Callbacks read through a ref so the queue never runs a stale handler.
  const handlers = useRef({ uploadHandler, onUploadComplete, onReject, onError, validate });
  handlers.current = { uploadHandler, onUploadComplete, onReject, onError, validate };

  // ---- upload queue -------------------------------------------------------

  const jobs = useRef(new Map<string, AbortController>());
  const pendingProgress = useRef(new Map<string, number>());
  const frame = useRef<number | null>(null);

  const flushProgress = useCallback(() => {
    frame.current = null;
    const pending = pendingProgress.current;
    if (pending.size === 0) return;
    pendingProgress.current = new Map();
    commit((files) =>
      files.map((file) =>
        pending.has(file.id) && file.status === 'uploading'
          ? { ...file, progress: pending.get(file.id) }
          : file
      )
    );
  }, [commit]);

  const pump = useCallback(() => {
    const handler = handlers.current.uploadHandler;
    if (!handler) return;
    for (const id of nextToStart(latest.current, concurrency)) {
      const file = latest.current.find((entry) => entry.id === id);
      if (!file) continue;
      const controller = new AbortController();
      jobs.current.set(id, controller);
      patch(id, { status: 'uploading', progress: 0, error: undefined });

      const context: FileUploadHandlerContext = {
        signal: controller.signal,
        onProgress: (progress) => {
          if (controller.signal.aborted) return;
          pendingProgress.current.set(id, Math.min(1, Math.max(0, progress)));
          frame.current ??= requestAnimationFrame(flushProgress);
        },
        setProcessing: () => {
          if (controller.signal.aborted) return;
          pendingProgress.current.delete(id);
          patch(id, { status: 'processing', progress: 1 });
        },
      };

      Promise.resolve()
        .then(() => handler({ ...file, status: 'uploading', progress: 0 }, context))
        .then(
          (response) => {
            if (controller.signal.aborted) return;
            jobs.current.delete(id);
            pendingProgress.current.delete(id);
            patch(id, { status: 'done', progress: 1, response, error: undefined });
            const done = latest.current.find((entry) => entry.id === id);
            if (done) handlers.current.onUploadComplete?.(done);
          },
          (error: unknown) => {
            if (controller.signal.aborted) return;
            jobs.current.delete(id);
            pendingProgress.current.delete(id);
            patch(id, {
              status: 'error',
              error: error instanceof Error && error.message ? error.message : 'Upload failed',
            });
          }
        );
    }
  }, [concurrency, flushProgress, patch]);

  // Whatever changed the list — a pick, a finish, a retry — may have freed a
  // slot or queued a file. Starting is idempotent, so running on every change
  // is the whole scheduler.
  useEffect(() => {
    pump();
  }, [value, pump, uploadHandler]);

  useEffect(() => {
    const running = jobs.current;
    return () => {
      for (const controller of running.values()) controller.abort();
      running.clear();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  const stop = useCallback((id: string) => {
    jobs.current.get(id)?.abort();
    jobs.current.delete(id);
    pendingProgress.current.delete(id);
  }, []);

  const remove = useCallback(
    (id: string) => {
      stop(id);
      setRejections([]);
      commit((files) => files.filter((file) => file.id !== id));
    },
    [commit, stop]
  );

  const cancel = useCallback(
    (id: string) => {
      const file = latest.current.find((entry) => entry.id === id);
      if (!file || !(isActive(file.status) || file.status === 'queued')) return;
      stop(id);
      patch(id, { status: 'canceled', progress: undefined });
    },
    [patch, stop]
  );

  const retry = useCallback(
    (id: string) => {
      if (!handlers.current.uploadHandler) return;
      patch(id, { status: 'queued', progress: 0, error: undefined });
    },
    [patch]
  );

  const uploadNow = useCallback(
    (id?: string) => {
      if (!handlers.current.uploadHandler) return;
      commit((files) =>
        files.map((file) =>
          (id === undefined || file.id === id) &&
          (file.status === 'idle' || file.status === 'canceled' || file.status === 'error')
            ? { ...file, status: 'queued', progress: 0, error: undefined }
            : file
        )
      );
    },
    [commit]
  );

  const clear = useCallback(() => {
    for (const id of [...jobs.current.keys()]) stop(id);
    setRejections([]);
    commit(() => []);
  }, [commit, stop]);

  // ---- picking ------------------------------------------------------------

  const report = useCallback((error: Error) => {
    if (handlers.current.onError) handlers.current.onError(error);
    else if (__DEV__) console.warn(`FileUpload: ${error.message}`);
  }, []);

  const pick = useCallback(
    async (source: FileUploadSource) => {
      if (disabled) return;
      // A single-file upload replaces its file rather than filling up.
      const replacing = !multiple;
      const held = replacing ? 0 : latest.current.length;
      const remaining = maxFiles === undefined ? undefined : Math.max(0, maxFiles - held);
      if (remaining === 0) return;
      const many = multiple && remaining !== 1;
      const quality = image?.quality ?? 0.9;
      const crop = !many ? image?.crop : undefined;

      let picked: FileUploadFile[];
      try {
        if (source === 'files') {
          const picker = loadDocumentPicker();
          if (!picker) throw missing(source);
          const result = await picker.getDocumentAsync({
            type: pickerTypes(accept),
            multiple: many,
            copyToCacheDirectory: true,
          });
          if (result.canceled) return;
          picked = (result.assets ?? []).map((asset) => fromDocument(asset));
        } else {
          const picker = loadImagePicker();
          if (!picker) throw missing(source);
          const options = {
            mediaTypes: source === 'camera' ? ['images'] : libraryMediaTypes(accept),
            allowsMultipleSelection: source === 'library' && many,
            selectionLimit: many ? (remaining ?? 0) : 1,
            orderedSelection: true,
            allowsEditing: crop !== undefined,
            aspect: crop?.aspect,
            quality,
            exif: false,
          };
          let result: PickerResult;
          if (source === 'camera') {
            const permission = await picker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              throw new Error('Camera permission was refused. It can be turned on in Settings.');
            }
            result = await picker.launchCameraAsync(options);
          } else {
            result = await picker.launchImageLibraryAsync(options);
          }
          if (result.canceled) return;
          picked = await Promise.all(
            (result.assets ?? []).map((asset, index) =>
              prepareImage(fromPickerAsset(asset, index), image, quality)
            )
          );
        }
      } catch (error) {
        report(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      const { accepted, rejected } = partitionFiles(picked, held, {
        accept,
        maxSize,
        minSize,
        maxFiles,
        validate: handlers.current.validate,
      });
      setRejections(rejected);
      if (rejected.length > 0) {
        handlers.current.onReject?.(rejected);
        AccessibilityInfo.announceForAccessibility(rejected.map((entry) => entry.message).join(' '));
      }
      if (accepted.length === 0) return;
      const status: FileUploadStatus =
        handlers.current.uploadHandler && autoUpload ? 'queued' : 'idle';
      const added = accepted.map((file) => ({ ...file, status }));
      if (replacing) {
        for (const file of latest.current) stop(file.id);
        commit(() => added.slice(0, 1));
      } else {
        commit((files) => [...files, ...added]);
      }
    },
    [accept, autoUpload, commit, disabled, image, maxFiles, maxSize, minSize, multiple, report, stop]
  );

  // A source whose picker could never return an allowed file is left out.
  const sources = useMemo(
    () =>
      sourcesProp.filter((source) => {
        if (source === 'files') return true;
        const media = libraryMediaTypes(accept);
        return source === 'camera' ? media.includes('images') : media.length > 0;
      }),
    [accept, sourcesProp]
  );

  const context = useMemo<FileUploadContextValue>(
    () => ({
      files: value,
      sources,
      sourceLabels: { ...DEFAULT_LABELS, ...sourceLabels },
      accept,
      maxFiles,
      maxSize,
      multiple,
      disabled,
      invalid,
      canAddMore: !disabled && (!multiple || maxFiles === undefined || value.length < maxFiles),
      hasUpload: uploadHandler !== undefined,
      rejections,
      pick,
      remove,
      cancel,
      retry,
      upload: uploadNow,
      clear,
    }),
    [
      accept,
      cancel,
      clear,
      disabled,
      invalid,
      maxFiles,
      maxSize,
      multiple,
      pick,
      rejections,
      remove,
      retry,
      sourceLabels,
      sources,
      uploadHandler,
      uploadNow,
      value,
    ]
  );

  return <FileUploadContext.Provider value={context}>{children}</FileUploadContext.Provider>;
}

function missing(source: FileUploadSource): Error {
  const name = MODULE_FOR[source];
  return new Error(`Adding from "${source}" needs ${name}. Install it with: npx expo install ${name}`);
}

function fromDocument(asset: DocumentAsset): FileUploadFile {
  const file = {
    uri: asset.uri,
    name: asset.name,
    size: asset.size ?? undefined,
    mimeType: asset.mimeType ?? undefined,
  };
  return { id: createFileId(), ...file, kind: kindOf(file), status: 'idle' };
}

function fromPickerAsset(asset: PickerAsset, index: number): FileUploadFile {
  const video = asset.type === 'video' || asset.mimeType?.startsWith('video/');
  const fallbackExt = video ? 'mp4' : 'jpg';
  const name = asset.fileName || `${video ? 'Video' : 'Photo'} ${timestamp()}${index ? `-${index + 1}` : ''}.${fallbackExt}`;
  const mimeType = asset.mimeType ?? (video ? 'video/mp4' : extensionOf(name) === 'png' ? 'image/png' : 'image/jpeg');
  return {
    id: createFileId(),
    uri: asset.uri,
    name,
    size: asset.fileSize ?? undefined,
    mimeType,
    width: asset.width,
    height: asset.height,
    kind: video ? 'video' : 'image',
    status: 'idle',
  };
}

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
}

/** Scale a photo into `maxWidth`/`maxHeight`, when it is larger and the manipulator is installed. */
async function prepareImage(
  file: FileUploadFile,
  options: FileUploadImageOptions | undefined,
  quality: number
): Promise<FileUploadFile> {
  if (file.kind !== 'image' || !options || !file.width || !file.height) return file;
  const target = fitWithin({ width: file.width, height: file.height }, options);
  if (!target) return file;
  const manipulator = loadManipulator()?.ImageManipulator;
  if (!manipulator) {
    if (__DEV__) {
      console.warn('FileUpload: resizing photos needs expo-image-manipulator. Install it with: npx expo install expo-image-manipulator');
    }
    return file;
  }
  const rendered = await manipulator.manipulate(file.uri).resize({ width: target.width }).renderAsync();
  const saved = await rendered.saveAsync({ format: 'jpeg', compress: quality });
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  // The resized file's size is not reported; it is smaller than the original.
  return { ...file, uri: saved.uri, width: saved.width, height: saved.height, name, size: undefined, mimeType: 'image/jpeg' };
}

// ---------------------------------------------------------------------------
// Source chooser
// ---------------------------------------------------------------------------

const SOURCE_ICONS: Record<FileUploadSource, (color?: string) => ReactNode> = {
  camera: (color) => <CameraIcon size={18} color={color} />,
  library: (color) => <ImageIcon size={18} color={color} />,
  files: (color) => <FolderIcon size={18} color={color} />,
};

/**
 * Wraps one pressable. With one source the press opens its picker; with more,
 * a sheet of the sources opens first, and the picker waits for it to leave so
 * the two never animate over each other.
 */
function SourceChooser({ children }: { children: ReactElement<{ onPress?: (...args: unknown[]) => void }> }) {
  const { sources, sourceLabels, pick, canAddMore } = useFileUpload();
  const iconColor = useCSSVariable('--color-foreground');
  const color = typeof iconColor === 'string' ? iconColor : undefined;

  if (sources.length <= 1) {
    const only = sources[0];
    return cloneElement(children, {
      onPress: (...args: unknown[]) => {
        children.props.onPress?.(...args);
        if (only && canAddMore) void pick(only);
      },
    });
  }

  if (!canAddMore) return children;

  const choose = (source: FileUploadSource) => {
    setTimeout(() => void pick(source), CHOOSER_EXIT_MS);
  };

  return (
    <Menu presentation="bottom-sheet">
      <Menu.Trigger>{children}</Menu.Trigger>
      <Menu.Content>
        {sources.map((source) => (
          <Menu.Item key={source} icon={SOURCE_ICONS[source](color)} onSelect={() => choose(source)}>
            {sourceLabels[source]}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  );
}

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

export interface FileUploadTriggerProps {
  /** One pressable — a Button, an icon button, an avatar. */
  children: ReactElement;
}

/**
 * Turns any pressable into the way files are added. With several sources it
 * opens a sheet listing them; with one it opens that picker directly.
 */
function FileUploadTrigger({ children }: FileUploadTriggerProps) {
  const { disabled, canAddMore } = useFileUpload();
  const child = Children.only(children) as ReactElement<{ disabled?: boolean; onPress?: () => void }>;
  const locked = disabled || !canAddMore;
  return (
    <SourceChooser>
      {isValidElement(child) && locked ? cloneElement(child, { disabled: true }) : child}
    </SourceChooser>
  );
}

// ---------------------------------------------------------------------------
// Dropzone
// ---------------------------------------------------------------------------

const dropzoneVariants = tv({
  slots: {
    root: 'items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40 px-6 py-7 active:bg-muted',
    // The pressable animates its own opacity for press feedback, which would
    // overwrite a dimming class on it — so the contents are what dim.
    body: 'items-center gap-3',
    badge: 'h-12 w-12 items-center justify-center rounded-full border border-border bg-background',
    title: 'text-center text-base font-semibold text-foreground',
    hint: 'text-center text-sm text-muted-foreground',
    error: 'text-center text-sm text-destructive',
  },
  variants: {
    invalid: { true: { root: 'border-destructive bg-destructive-subtle' } },
    disabled: { true: { body: 'opacity-50' } },
  },
});

export interface FileUploadDropzoneProps extends Omit<AnimatedPressableProps, 'children'> {
  className?: string;
  /** Headline. Default "Choose files", or "Choose a file" for a single file. */
  title?: ReactNode;
  /** The line under it. Written from `accept`, `maxSize` and `maxFiles` when left out. */
  description?: ReactNode;
  /** Replaces the upload glyph in the badge. */
  icon?: ReactNode;
  /** Draw the inside yourself. The press still opens the sources. */
  children?: ReactNode;
}

/**
 * The large dashed area at the top of a form. Pressing anywhere on it adds
 * files, and the line under the title says what is allowed before anybody
 * picks something that is not. When a pick is turned away, the reason replaces
 * that line until the next pick.
 */
const FileUploadDropzone = forwardRef<ViewRef, FileUploadDropzoneProps>(
  ({ className, title, description, icon, children, ...props }, ref) => {
    const { accept, maxSize, maxFiles, multiple, disabled, invalid, canAddMore, rejections, files } =
      useFileUpload();
    const labelledBy = useFieldLabelledBy();
    const primary = useCSSVariable('--color-foreground');
    const full = multiple && maxFiles !== undefined && files.length >= maxFiles;
    const first = rejections[0];
    const rejected = first
      ? rejections.length > 1
        ? `${first.message} ${rejections.length - 1} more could not be added.`
        : first.message
      : null;
    const slots = dropzoneVariants({ invalid: invalid || rejected !== null, disabled: disabled || full });

    const heading = title ?? (multiple ? 'Choose files' : 'Choose a file');
    const hint = full
      ? `${files.length} of ${maxFiles} added. Remove one to add another.`
      : (description ?? describeRules({ accept, maxSize, maxFiles: multiple ? maxFiles : undefined }));

    return (
      <SourceChooser>
        <AnimatedPressable
          ref={ref}
          accessibilityRole="button"
          accessibilityLabel={[typeof heading === 'string' ? heading : null, typeof hint === 'string' ? hint : null]
            .filter(Boolean)
            .join('. ')}
          accessibilityState={{ disabled: disabled || !canAddMore }}
          accessibilityLabelledBy={labelledBy}
          disabled={disabled || !canAddMore}
          className={slots.root({ className })}
          {...props}
        >
          <View className={slots.body()}>
          {children ?? (
            <>
              <View className={slots.badge()}>
                {icon ?? <UploadIcon size={22} color={typeof primary === 'string' ? primary : undefined} />}
              </View>
              <View className="gap-1">
                {typeof heading === 'string' ? <Text className={slots.title()}>{heading}</Text> : heading}
                {hint ? (
                  typeof hint === 'string' ? <Text className={slots.hint()}>{hint}</Text> : hint
                ) : null}
                {rejected ? (
                  <Text className={slots.error()} accessibilityLiveRegion="polite">
                    {rejected}
                  </Text>
                ) : null}
              </View>
            </>
          )}
          </View>
        </AnimatedPressable>
      </SourceChooser>
    );
  }
);
FileUploadDropzone.displayName = 'FileUpload.Dropzone';

// ---------------------------------------------------------------------------
// Item and List
// ---------------------------------------------------------------------------

const ATTACHMENT_STATE: Record<FileUploadStatus, AttachmentState> = {
  idle: 'idle',
  queued: 'idle',
  uploading: 'uploading',
  processing: 'processing',
  done: 'done',
  error: 'error',
  canceled: 'idle',
};

/** "PDF · 2.4 MB", "1.1 of 2.4 MB · 46%", "Waiting", "Upload failed". */
export function describeFileStatus(file: FileUploadFile): string {
  const ext = extensionOf(file.name).toUpperCase();
  const size = file.size !== undefined ? formatFileSize(file.size) : '';
  const percent = `${Math.round((file.progress ?? 0) * 100)}%`;
  switch (file.status) {
    case 'queued':
      return ['Waiting', size].filter(Boolean).join(' · ');
    case 'uploading':
      return file.size !== undefined
        ? `${formatFileSize(file.size * (file.progress ?? 0))} of ${size} · ${percent}`
        : `Uploading · ${percent}`;
    case 'processing':
      return 'Processing…';
    case 'done':
      return [size, 'Uploaded'].filter(Boolean).join(' · ');
    case 'error':
      return file.error ?? 'Upload failed';
    case 'canceled':
      return ['Canceled', size].filter(Boolean).join(' · ');
    default:
      return [ext, size].filter(Boolean).join(' · ');
  }
}

function KindIcon({ kind, size = 18, color }: { kind: FileUploadKind; size?: number; color?: string }) {
  if (kind === 'image') return <ImageIcon size={size} color={color} />;
  if (kind === 'video') return <VideoIcon size={size} color={color} />;
  return <FileIcon size={size} color={color} />;
}

export interface FileUploadItemProps {
  file: FileUploadFile;
  className?: string;
  /** Row density. */
  size?: 'default' | 'sm';
  /**
   * Longest name shown before it is shortened from the middle, keeping the
   * extension. Default 36.
   */
  nameLength?: number;
}

/**
 * One file as an Attachment row: a thumbnail or type icon, the name, a status
 * line, and the action that fits the state — cancel while it is moving, retry
 * when it failed or was stopped, remove otherwise.
 */
function FileUploadItem({ file, className, size = 'default', nameLength = 36 }: FileUploadItemProps) {
  const { remove, cancel, retry, disabled, hasUpload } = useFileUpload();
  const muted = useCSSVariable('--color-muted-foreground');
  const success = useCSSVariable('--color-success');
  const mutedColor = typeof muted === 'string' ? muted : undefined;
  const moving = isActive(file.status) || file.status === 'queued';
  const failed = file.status === 'error' || file.status === 'canceled';
  const status = describeFileStatus(file);

  return (
    <Attachment
      state={ATTACHMENT_STATE[file.status]}
      progress={file.status === 'uploading' ? (file.progress ?? 0) : undefined}
      size={size}
      disabled={disabled}
      accessibilityLabel={`${file.name}, ${status}`}
      className={className}
    >
      {file.kind === 'image' ? (
        <Attachment.Media variant="image">
          <Image source={{ uri: file.uri }} className="h-full w-full" resizeMode="cover" />
        </Attachment.Media>
      ) : (
        <Attachment.Media variant="icon">
          <KindIcon kind={file.kind} color={mutedColor} size={size === 'sm' ? 16 : 18} />
        </Attachment.Media>
      )}
      <Attachment.Content>
        {/* Shortened by hand: the shimmer a busy row draws cannot clip to one line. */}
        <Attachment.Title numberOfLines={1}>{truncateMiddle(file.name, nameLength)}</Attachment.Title>
        <Attachment.Description numberOfLines={file.status === 'error' ? 2 : 1}>
          {status}
        </Attachment.Description>
      </Attachment.Content>
      <Attachment.Actions>
        {file.status === 'done' ? (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <CheckCircleIcon size={18} color={typeof success === 'string' ? success : undefined} />
          </View>
        ) : null}
        {failed && hasUpload ? (
          <Attachment.Action
            accessibilityLabel={`Retry ${file.name}`}
            disabled={disabled}
            onPress={() => retry(file.id)}
          >
            <RotateCcwIcon size={16} color={mutedColor} />
          </Attachment.Action>
        ) : null}
        <Attachment.Action
          accessibilityLabel={moving ? `Cancel upload of ${file.name}` : `Remove ${file.name}`}
          disabled={disabled}
          onPress={() => (moving ? cancel(file.id) : remove(file.id))}
        >
          {moving ? <XIcon size={16} color={mutedColor} /> : <TrashIcon size={16} color={mutedColor} />}
        </Attachment.Action>
      </Attachment.Actions>
    </Attachment>
  );
}

export interface FileUploadListProps extends ViewProps {
  className?: string;
  /** Lay the files out as one scrolling strip of fixed-width rows, for a message composer. */
  horizontal?: boolean;
  /** Row density. */
  size?: 'default' | 'sm';
  /** Draw a row yourself. `FileUpload.Item` is the default. */
  renderItem?: (file: FileUploadFile) => ReactNode;
  /** Shown when the list is empty. Nothing by default. */
  empty?: ReactNode;
}

/** Every file as a row, in the order it was added. */
const FileUploadList = forwardRef<ViewRef, FileUploadListProps>(
  ({ className, horizontal = false, size, renderItem, empty, ...props }, ref) => {
    const { files } = useFileUpload();
    if (files.length === 0) return empty ? <>{empty}</> : null;

    const rows = files.map((file) =>
      renderItem ? (
        <View key={file.id}>{renderItem(file)}</View>
      ) : (
        <FileUploadItem
          key={file.id}
          file={file}
          size={size}
          className={horizontal ? 'w-72' : undefined}
          nameLength={horizontal ? 16 : undefined}
        />
      )
    );

    if (horizontal) {
      return (
        <View ref={ref} className={className} {...props}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {rows}
          </ScrollView>
        </View>
      );
    }
    return (
      <View ref={ref} accessibilityRole="list" className={cn('gap-2', className)} {...props}>
        {rows}
      </View>
    );
  }
);
FileUploadList.displayName = 'FileUpload.List';

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A ring that fills with upload progress, drawn over a tile's scrim. */
function ProgressRing({ progress, size = 36 }: { progress: number; size?: number }) {
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const shown = useSharedValue(progress);

  useEffect(() => {
    shown.value = withTiming(progress, { duration: 180 });
  }, [progress, shown]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - shown.value),
  }));

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.3)" strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#fff"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        fill="none"
      />
    </Svg>
  );
}

function GridTile({
  file,
  size,
  cover,
  radius,
}: {
  file: FileUploadFile;
  size: number;
  cover: boolean;
  radius: number;
}) {
  const { remove, cancel, retry, disabled, hasUpload } = useFileUpload();
  const muted = useCSSVariable('--color-muted-foreground');
  const foreground = useCSSVariable('--color-foreground');
  const moving = isActive(file.status) || file.status === 'queued';
  const failed = file.status === 'error' || file.status === 'canceled';
  const status = describeFileStatus(file);

  return (
    <View
      style={{ width: size, height: size }}
      className={cn(disabled && 'opacity-50')}
      accessibilityLabel={`${file.name}, ${status}`}>
      {file.kind === 'image' ? (
        <View style={{ borderRadius: radius }} className="h-full w-full overflow-hidden bg-muted">
          <ImageViewer.Trigger
            source={{ uri: file.uri }}
            width={file.width}
            height={file.height}
            alt={file.name}
            radius={radius}
            disabled={moving}
            className="h-full w-full"
          />
        </View>
      ) : (
        <View
          style={{ borderRadius: radius }}
          className="h-full w-full items-center justify-center gap-1.5 border border-border bg-muted px-2"
        >
          <KindIcon kind={file.kind} size={22} color={typeof muted === 'string' ? muted : undefined} />
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {file.name}
          </Text>
        </View>
      )}

      {moving || failed ? (
        <View
          pointerEvents="box-none"
          style={{ borderRadius: radius }}
          className="absolute inset-0 items-center justify-center bg-black/45"
        >
          {file.status === 'uploading' ? (
            <ProgressRing progress={file.progress ?? 0} />
          ) : file.status === 'queued' || file.status === 'processing' ? (
            <Text className="text-xs font-medium text-white">
              {file.status === 'queued' ? 'Waiting' : 'Processing'}
            </Text>
          ) : hasUpload ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={`Retry ${file.name}`}
              disabled={disabled}
              onPress={() => retry(file.id)}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
            >
              <RotateCcwIcon size={18} color="#fff" />
            </AnimatedPressable>
          ) : null}
        </View>
      ) : null}

      {cover ? (
        <View className="absolute bottom-1.5 left-1.5 rounded-full bg-background/90 px-2 py-0.5">
          <Text className="text-[11px] font-semibold text-foreground">Cover</Text>
        </View>
      ) : null}

      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={moving ? `Cancel upload of ${file.name}` : `Remove ${file.name}`}
        disabled={disabled}
        hitSlop={8}
        onPress={() => (moving ? cancel(file.id) : remove(file.id))}
        className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full border border-border bg-background active:bg-muted"
      >
        <XIcon size={12} color={typeof foreground === 'string' ? foreground : undefined} strokeWidth={2.5} />
      </AnimatedPressable>
    </View>
  );
}

export interface FileUploadGridProps extends ViewProps {
  className?: string;
  /** Tiles per row. Default 3. Ignored when `horizontal`. */
  columns?: number;
  /** Lay the tiles out as one scrolling strip. */
  horizontal?: boolean;
  /** Tile size in points, for a horizontal strip. Default 88. */
  tileSize?: number;
  /** Space between tiles, in points. Default 8. */
  gap?: number;
  /** Corner radius of a tile, in points. Default 12. */
  radius?: number;
  /** Mark the first photo as the cover. */
  cover?: boolean;
  /** Draw empty slots for the rest of `maxFiles`, so the limit can be seen. */
  placeholders?: boolean;
  /** Label of the add tile. Default "Add photo" or "Add photos". */
  addLabel?: string;
  /** Leave the add tile out — for a grid with its own Trigger elsewhere. */
  hideAdd?: boolean;
}

/**
 * Photos as square tiles, led by a tile that adds more. Each photo opens in
 * the full-screen viewer, carries its own remove button, and shows a ring
 * while it uploads. The add tile counts against `maxFiles`, so the limit is
 * visible before anybody hits it.
 */
const FileUploadGrid = forwardRef<ViewRef, FileUploadGridProps>(
  (
    {
      className,
      columns = 3,
      horizontal = false,
      tileSize = 88,
      gap = 8,
      radius = 12,
      cover = false,
      placeholders = false,
      addLabel,
      hideAdd = false,
      onLayout,
      ...props
    },
    ref
  ) => {
    const { files, maxFiles, multiple, canAddMore } = useFileUpload();
    const [width, setWidth] = useState(0);
    const background = useCSSVariable('--color-background');
    const muted = useCSSVariable('--color-muted-foreground');

    const size = horizontal
      ? tileSize
      : width > 0
        ? Math.floor((width - gap * (columns - 1)) / columns)
        : 0;

    const showAdd = !hideAdd && canAddMore;
    const slotCount =
      placeholders && maxFiles !== undefined
        ? Math.max(0, maxFiles - files.length - (showAdd ? 1 : 0))
        : 0;
    // Empty slots only finish the current row; a page of them is noise.
    const filled = files.length + (showAdd ? 1 : 0);
    const rowRemainder = filled % columns === 0 ? 0 : columns - (filled % columns);
    const visibleSlots = horizontal ? slotCount : Math.min(slotCount, rowRemainder);

    const label = addLabel ?? (multiple ? 'Add photos' : 'Add photo');
    const tiles: ReactNode[] = [];

    if (showAdd && size > 0) {
      tiles.push(
        <SourceChooser key="add">
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={
              maxFiles !== undefined ? `${label}, ${files.length} of ${maxFiles}` : label
            }
            style={{ width: size, height: size, borderRadius: radius }}
            className="items-center justify-center gap-1 border-2 border-dashed border-border bg-muted/40 active:bg-muted"
          >
            <View className="h-8 w-8 items-center justify-center rounded-full bg-foreground">
              <PlusIcon
                size={16}
                strokeWidth={2.5}
                color={typeof background === 'string' ? background : undefined}
              />
            </View>
            {size >= 84 ? (
              <Text className="text-xs font-medium text-foreground" numberOfLines={1}>
                {label}
              </Text>
            ) : null}
            {maxFiles !== undefined && multiple ? (
              <Text className="text-[11px] text-muted-foreground">
                {files.length}/{maxFiles}
              </Text>
            ) : null}
          </AnimatedPressable>
        </SourceChooser>
      );
    }

    if (size > 0) {
      files.forEach((file, index) =>
        tiles.push(
          <GridTile key={file.id} file={file} size={size} cover={cover && index === 0} radius={radius} />
        )
      );
      for (let i = 0; i < visibleSlots; i += 1) {
        tiles.push(
          <View
            key={`slot-${i}`}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ width: size, height: size, borderRadius: radius }}
            className="items-center justify-center border border-dashed border-border"
          >
            <ImageIcon size={18} color={typeof muted === 'string' ? muted : undefined} opacity={0.5} />
          </View>
        );
      }
    }

    const body = horizontal ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap }}>
        {tiles}
      </ScrollView>
    ) : (
      <View className="flex-row flex-wrap" style={{ gap }}>
        {tiles}
      </View>
    );

    return (
      <View
        ref={ref}
        className={className}
        onLayout={(event: LayoutChangeEvent) => {
          setWidth(event.nativeEvent.layout.width);
          onLayout?.(event);
        }}
        {...props}
      >
        <ImageViewer>{body}</ImageViewer>
      </View>
    );
  }
);
FileUploadGrid.displayName = 'FileUpload.Grid';

FileUploadRoot.displayName = 'FileUpload';
FileUploadTrigger.displayName = 'FileUpload.Trigger';
FileUploadItem.displayName = 'FileUpload.Item';

export const FileUpload = Object.assign(FileUploadRoot, {
  Trigger: FileUploadTrigger,
  Dropzone: FileUploadDropzone,
  List: FileUploadList,
  Item: FileUploadItem,
  Grid: FileUploadGrid,
});
