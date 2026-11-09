/**
 * Pixel-art covers for blog posts, drawn by hand on a 64 × 36 grid.
 *
 * Each character is one pixel, and each character names a theme role rather
 * than a colour, so a cover follows the reader's light or dark theme like the
 * rest of the page:
 *
 * | char | role |
 * | --- | --- |
 * | `.` | nothing — the cover's own background shows through |
 * | `-` | border |
 * | `#` | foreground |
 * | `o` | background |
 * | `c` | muted, over the background |
 * | `m` | muted foreground |
 * | `p` | primary |
 * | `1`–`5` | chart-1 to chart-5 |
 *
 * A post names its cover in frontmatter (`cover: <key>`).
 */
export const COVER_WIDTH = 64;
export const COVER_HEIGHT = 36;

export const COVERS: Record<string, readonly string[]> = {
  /** A phone assembling its screen from blocks, with finished panels beside it. */
  'why-panelui-exists': [
    '................................................................',
    '..-...-...-...-...-...-...-...-...-...-...-...-...-...-...-...-.',
    '........................################........................',
    '.......................##################...................5...',
    '.......................##ooooo####ooooo##..................5.5..',
    '..-...11111...-...-...-##oooooooooooooo##.-...-...-...-...-.5.-.',
    '......1pp11............##ommmoooooommmo##......###########......',
    '......1p111............##oooooooooooooo##.....#ccccccccccc#.....',
    '......11111m...........##o#######oooooo##.....#c######cccc#.....',
    '..-...11111..m-...-...-##o#######oooooo##.-...#ccccccccccc#...-.',
    '...............m.......##oooooooooooooo##.....#cmmmmmmmmmc#.....',
    '.................m.....##ommmmmmmmmmooo##.....#ccccccccccc#.....',
    '...................m...##oooooooooooooo##.....#cmmmmmccccc#.....',
    '..-...-...-.22222.-...-##o.----------.o##.-...#ccccccccccc#...-.',
    '............2pp22......##o-ccc2cccccc-o##......###########......',
    '............2p222......##o-ccc2ccc4cc-o##.......................',
    '............22222......##o-c1c2ccc4cc-o##.......................',
    '..-...-...-.22222.m...-##o-c1c2c3c4cc-o##.-...-...----------..-.',
    '....................m..##o-c1c2c3c4cc-o##........-cccccccccc-...',
    '.......................##o-c1c2c3c4cc-o##........-c4444ccccc-...',
    '.......................##o------------o##........-cccccccccc-...',
    '..-..33333-...-...-...-##o.----------.o##.-...-..-cmmmmmmmcc-.-.',
    '.....3pp33.............##oooooooooooooo##........-cccccccccc-...',
    '.....3p333.............##oooooooo.ppp.o##.........----------....',
    '.....33333.m..m........##ommmmmmopppopo##.......................',
    '..-..33333-...-..m-.m.-##oooooooo.ppp.o##.-...-...-...-...-...-.',
    '.......................##o2ommmmmmooooo##.....------------......',
    '.......................##oooooooooooooo##....-c.pppp.ccccc-.....',
    '.......................##o1ommmmmmmmooo##....-cppppppccmmc-.....',
    '..-...-...-...-...-...-##oooooooooooooo##.-..-c.pppp.ccccc-...-.',
    '.......................##o.pppppppppp.o##.....------------......',
    '...5...................##oppppooooppppo##.......................',
    '..5.5..................##o.pppppppppp.o##.......................',
    '..-5..-...-...-...-...-##################.-...-...-...-...-...-.',
    '........................################........................',
    '................................................................',
  ],
};
