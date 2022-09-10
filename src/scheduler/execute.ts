import { Process } from "./process";

export function execute<T extends { processes: Array<Process> }>(
  alghoritm: (state: T) => T,
  state: T,
  n: number
) {
  for (let i = 0; i < n; i++) {
    state = alghoritm(state);

    if (state.processes.every((e) => e.state === "finished")) {
      break;
    }
  }

  const historyTable = [];
  state.processes.sort((a, b) => a.uuid.localeCompare(b.uuid));
  for (let i = 0; i < state.processes[0].history.length; i++) {
    historyTable.push(
      Object.fromEntries(state.processes.map((e) => [e.uuid, e.history[i]]))
    );
  }
  console.table(historyTable);
}

// execute(
//     fcfs,
//     {
//         queue: [],
//         processes: makeProcesses([
//             makePlannedProcess(parsePlans('3E', '2P', 'E')),
//             makePlannedProcess(parsePlans('4E', 'P', '4E')),
//             ...makeRandomProcesses(5),
//         ]),
//     },
//     50,
// )
