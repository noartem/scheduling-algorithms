import { sortBy } from "lodash";
import { Process, ProcessId } from "./process";

export interface FCFSState {
  queue: Array<ProcessId>;
  processes: Array<Process>;
}

export function fcfs(state: FCFSState): FCFSState {
  const newProcesses: Array<Process> = [];
  const otherProcesses = sortBy(state.processes, "uuid");

  const executingProcess = state.processes.find((e) => e.state === "executing");
  if (executingProcess) {
    otherProcesses.splice(
      otherProcesses.findIndex((e) => e.uuid === executingProcess.uuid),
      1
    );
  }

  const executingProcessNext = executingProcess?.next(executingProcess);
  if (executingProcess && executingProcessNext) {
    newProcesses.push({
      ...executingProcess,
      state: executingProcessNext,
      history: [...executingProcess.history, executingProcessNext],
    });
  }

  const newQueue = state.queue
    .filter((e) => state.processes.some((p) => e === p.uuid))
    .concat(
      otherProcesses
        .filter(
          (e) =>
            (e.state === "ready" || e.next(e) === "executing") &&
            !state.queue.includes(e.uuid)
        )
        .map((e) => e.uuid)
    );

  if (executingProcessNext !== "executing") {
    const readyProcess = state.processes.find((e) => e.uuid === newQueue[0]);
    if (readyProcess) {
      newQueue.splice(0, 1);
      newProcesses.push({
        ...readyProcess,
        state: "executing",
        history: [...readyProcess.history, "executing"],
      });
      otherProcesses.splice(
        otherProcesses.findIndex((e) => e.uuid === readyProcess.uuid),
        1
      );
    }
  }

  newProcesses.push(
    ...otherProcesses
      .filter((e) => newQueue.includes(e.uuid))
      .map(
        (e): Process => ({
          ...e,
          history: [...e.history, "ready"],
          state: "ready",
        })
      )
  );

  newProcesses.push(
    ...otherProcesses
      .filter((e) => !newQueue.includes(e.uuid))
      .map(
        (e): Process => ({
          ...e,
          history: [...e.history, e.state],
        })
      )
  );

  return { queue: newQueue, processes: newProcesses };
}
