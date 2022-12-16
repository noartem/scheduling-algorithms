import { Process, ProcessId } from "./process";
import { groupBy, sortBy } from "lodash";
import { rr } from "./rr";
import { fcfs } from "./fcfs";

enum MLQType {
  HIGH,
  NORMAL,
  LOW,
}

export interface MLQState {
  queues: Partial<Record<MLQType, Array<ProcessId>>>;
  processes: Array<Process>;
}

export function getPriorityType(priority: number) {
  if (priority > 66) {
    return MLQType.HIGH;
  }

  if (priority > 33) {
    return MLQType.NORMAL;
  }

  return MLQType.LOW;
}

interface ProcessesGroup {
  priority: MLQType;
  processes: Array<Process>;
  queue: Array<ProcessId>;
}

function groypStateProcessesByPriority(state: MLQState): Array<ProcessesGroup> {
  const processes = state.processes.map((e) => ({
    ...e,
    priorityGroup: getPriorityType(e.priority),
  }));
  const grouppedProccesses = groupBy(processes, "priorityGroup");
  const grouppedProccessesList = Object.entries(grouppedProccesses).map(
    ([priority, processes]) => ({
      priority: Number(priority),
      processes,
      queue: state.queues[getPriorityType(Number(priority))] ?? [],
    })
  );
  const sortedGrouppedProccessesList = sortBy(
    grouppedProccessesList,
    "priorityGroup"
  );
  return sortedGrouppedProccessesList;
}

export function mlq(state: MLQState, timeout = 2): MLQState {
  const proccessesGroups = groypStateProcessesByPriority(state);

  const newStates = [];
  let hasExecuting = false;
  for (const proccessesGroup of proccessesGroups) {
    const newProccessesGroup = hasExecuting
      ? tickProcessesGroup(proccessesGroup)
      // : rr(proccessesGroup, timeout);
      : fcfs(proccessesGroup, timeout);

    if (
      !hasExecuting &&
      newProccessesGroup.processes.some((e) => e.state === "executing")
    ) {
      hasExecuting = true;
    }

    newStates.push({ ...proccessesGroup, ...newProccessesGroup });
  }

  const newQueues = Object.fromEntries(
    newStates.map((e) => [e.priority, e.queue])
  );
  const newProcesses = newStates.flatMap((e) => e.processes);
  return { queues: newQueues, processes: newProcesses };
}

export function tickProcessesGroup(state: ProcessesGroup): ProcessesGroup {
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

  if (executingProcess) {
    const executingProcessNext = executingProcess.next(executingProcess);
    const executingProcessRealNext =
      executingProcessNext === "executing" ? "ready" : executingProcessNext;
    newProcesses.push({
      ...executingProcess,
      state: executingProcessRealNext,
      history: [...executingProcess.history, executingProcessRealNext],
    });
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

  return { ...state, queue: newQueue, processes: newProcesses };
}
