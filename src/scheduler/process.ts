import { nanoid } from "nanoid";
import { memoize, random } from "lodash";

export type ProcessId = string;

export type ProcessState = "ready" | "pending" | "executing" | "finished";

export type ProcessNext = (process: Process) => ProcessState;

export interface Process {
  uuid: ProcessId;
  state: ProcessState;
  history: Array<ProcessState>;
  next: ProcessNext;
}

let processCount = 1;

export function makeProcesses(next: ProcessNext): Process {
  return {
    next,
    uuid: String(processCount++).padStart(4, "0"),
    state: "ready",
    history: [],
  };
}

export function randomIn<T>(value: Array<T>) {
  return value[random(value.length - 1)];
}

export function makeRandomProcess() {
  return makeProcesses(
    memoize(
      (p: Process) => {
        if (p.state === "finished" || p.history.some((e) => e === "finished")) {
          return "finished";
        } else if (p.state === "ready") {
          return "executing";
        } else if (p.state === "pending") {
          return randomIn(["pending", "pending", "executing"]);
        } else if (p.state === "executing") {
          return randomIn(["pending", "pending", "executing", "finished"]);
        } else {
          return "finished";
        }
      },
      (e) => JSON.stringify(e)
    )
  );
}

export interface Plan {
  state: "pending" | "executing";
  duration: number;
}

export function parsePlans(
  ...plans: Array<string> | Array<Array<string>>
): Array<Plan> {
  return plans
    .flatMap((e) => (Array.isArray(e) ? e : [e]))
    .flatMap((e) => e.split(" "))
    .flatMap((e) => e.split(","))
    .flatMap((e) => e.split(";"))
    .flatMap((e) => e.split("|"))
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
    .filter((e) => ["e", "p"].includes(e.at(-1)?.toLowerCase() ?? ""))
    .filter((e) => !isNaN(parseInt(e.slice(0, -1) || "1")))
    .map((e) => {
      const duration = parseInt(e.slice(0, -1) || "1");
      const state = e.at(-1)?.toLowerCase();
      if (state === "e") {
        return { state: "executing", duration: duration };
      } else {
        return { state: "pending", duration: duration };
      }
    });
}

export function makePlannedProcess(plans: Array<Plan>) {
  return makeProcesses((p: Process) => {
    if (plans.length === 0 || p.history.some((e) => e === "finished")) {
      return "finished";
    }

    const plansLeft = plans.map((e) => ({ ...e }));

    for (const state of p.history) {
      if (state === "ready") {
        continue;
      }

      if (state === plansLeft[0].state) {
        plansLeft[0].duration -= 1;
        continue;
      }

      if (plansLeft[0].duration <= 0) {
        plansLeft.shift();

        if (plansLeft.length === 0) {
          return "finished";
        }

        if (state === plansLeft[0].state) {
          plansLeft[0].duration -= 1;
          continue;
        }
      }
    }

    if (plansLeft.length > 0 && plansLeft[0].duration <= 0) {
      plansLeft.shift();
    }

    if (plansLeft.length > 0 && plansLeft[0].duration > 0) {
      return plansLeft[0].state;
    }

    return "finished";
  });
}
