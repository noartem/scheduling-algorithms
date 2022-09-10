import { Process, ProcessId } from "./process";
import { sortBy } from "lodash";

export interface RRState {
  queue: Array<ProcessId>;
  processes: Array<Process>;
}

export function rr(state: RRState, timeout = 2): RRState {
  const newProcesses: Array<Process> = [];
  const otherProcesses = sortBy(state.processes, "uuid");

  const executingProcess = state.processes.find((e) => e.state === "executing");
  if (executingProcess) {
    otherProcesses.splice(
      otherProcesses.findIndex((e) => e.uuid === executingProcess.uuid),
      1
    );
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

  const executingProcessReachedTimeout =
    executingProcess &&
    newQueue.length > 0 &&
    executingProcess.history.length >= timeout &&
    executingProcess.history
      .slice(-1 * timeout)
      .every((e) => e === "executing");

  const executingProcessNext = executingProcess?.next(executingProcess);
  if (executingProcess && executingProcessNext) {
    const executingProcessRealNext =
      executingProcessNext === "executing"
        ? executingProcessReachedTimeout
          ? "ready"
          : "executing"
        : executingProcessNext;
    newProcesses.push({
      ...executingProcess,
      state: executingProcessRealNext,
      history: [...executingProcess.history, executingProcessRealNext],
    });
  }

  if (
    !executingProcess ||
    executingProcessReachedTimeout ||
    executingProcessNext !== "executing"
  ) {
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
