import { Table } from 'panelui-web/table';

const READINGS = Array.from({ length: 24 }, (_, hour) => {
  const temp = 11 + Math.round(6 * Math.sin(((hour - 9) / 24) * Math.PI * 2) * 10) / 10;
  const wind = 8 + ((hour * 7) % 11);
  const rain = hour >= 15 && hour <= 18 ? ((hour * 3) % 5) / 2 + 0.5 : 0;
  return { time: `${String(hour).padStart(2, '0')}:00`, temp, wind, rain };
});

export default function TableScroll() {
  return (
    <Table maxHeight="16rem" containerClassName="w-full max-w-md rounded-lg border" framed>
      <Table.Caption className="pb-3">Hourly readings, weather station 4</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.Head>Time</Table.Head>
          <Table.Head align="end">Temp °C</Table.Head>
          <Table.Head align="end">Wind km/h</Table.Head>
          <Table.Head align="end">Rain mm</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {READINGS.map((row) => (
          <Table.Row key={row.time}>
            <Table.Cell className="tabular-nums">{row.time}</Table.Cell>
            <Table.Cell align="end">{row.temp.toFixed(1)}</Table.Cell>
            <Table.Cell align="end">{row.wind}</Table.Cell>
            <Table.Cell align="end">{row.rain.toFixed(1)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
