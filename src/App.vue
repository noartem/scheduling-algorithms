<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { fcfs, FCFSState } from "./scheduler/fcfs";
import { rr, RRState } from "./scheduler/rr";
import { mlq, MLQState } from "./scheduler/mlq";
import {
  Process,
  makeProcesses,
  makePlannedProcess,
  parsePlans,
  makeRandomProcess,
  ProcessState,
  ProcessId,
} from "./scheduler/process";
import { sortBy, debounce, random } from "lodash";
import domtoimage from "dom-to-image";

const processColors: Record<ProcessState, string> = {
  executing: "#6750A4",
  pending: "#7D5260",
  ready: "#79747E",
  finished: "#635B70",
};

const schedulingAlghoritmType = ref<"fcfs" | "rr" | "mlq">("fcfs");

const schedulingAlghoritms = {fcfs, rr, mlq};

const schedulingAlghoritm = computed(
  () => schedulingAlghoritms[schedulingAlghoritmType.value]
);

watch([schedulingAlghoritmType], () => {
  state.value.queue = [];
  state.value.queues = {};
});

const state = ref<FCFSState & RRState & MLQState>({
  processes: [
    makePlannedProcess(parsePlans("10E"), 10),
    makePlannedProcess(parsePlans("20E"), 15),
    makePlannedProcess(parsePlans("5E 2P 5E"), 60),
    makePlannedProcess(parsePlans("10E 2P 5E"), 65),
    makePlannedProcess(parsePlans("E 20P 5E"), 100),
  ],
  queue: [],
  queues: {},
});

const stateProceses = computed(() => sortBy(state.value.processes, "uuid"));

const history = computed(() => {
  if (stateProceses.value.length === 0) {
    return [];
  }

  const historyTable: Array<Array<[ProcessId, ProcessState]>> = [];
  for (let i = 0; i < stateProceses.value[0].history.length; i++) {
    historyTable.push(stateProceses.value.map((e) => [e.uuid, e.history[i]]));
  }
  return historyTable;
});

const tableWrapper = ref<HTMLDivElement>();

const finished = computed(() =>
  state.value.processes.every((e) => e.state === "finished")
);

function approximatelyEqual(a: number, b: number, accuracy = 5) {
  return Math.abs(a - b) <= accuracy;
}

const updateState = () => {
  const scrollToBottom =
    tableWrapper.value &&
    approximatelyEqual(
      tableWrapper.value.scrollHeight,
      tableWrapper.value.clientHeight + tableWrapper.value.scrollTop
    );

  state.value = { ...state.value, ...schedulingAlghoritm.value(state.value) };

  if (finished.value) {
    stop();
  }

  if (scrollToBottom) {
    nextTick(() => {
      if (tableWrapper.value) {
        tableWrapper.value.scrollTop =
          tableWrapper.value.scrollHeight - tableWrapper.value.clientHeight;
      }
    });
  }
};

const updatingInterval = ref<ReturnType<typeof setInterval> | null>(null);

const speed = ref(500);

const rrTimeout = ref(2);

const start = () => {
  updatingInterval.value = setInterval(updateState, speed.value);
};

const stop = () => {
  if (updatingInterval.value) {
    clearInterval(updatingInterval.value);
    updatingInterval.value = null;
  }
};

watch(
  [speed],
  debounce(() => {
    if (updatingInterval.value !== null) {
      stop();
      start();
    }
  }, 600)
);

const removeProcess = (process: Process) => {
  state.value.processes = state.value.processes.filter(
    (e) => e.uuid !== process.uuid
  );
};

const addRandomProcess = () => {
  const process = makeRandomProcess();
  process.history.push(
    ...new Array(state.value.processes[0]?.history?.length ?? 0)
      .fill(0)
      .map((e) => "ready" as ProcessState)
  );
  state.value.processes.push(process);
};

const plannedProcessTemplate = ref("");
const plannedProcessPriority = ref(0);

const addPlannedProcess = () => {
  if (plannedProcessTemplate.value.length > 0) {
    const process = makePlannedProcess(
      parsePlans(plannedProcessTemplate.value),
      plannedProcessPriority.value || random(0, 5),
    );
    process.history.push(
      ...new Array(state.value.processes[0]?.history?.length ?? 0)
        .fill(0)
        .map((e) => "ready" as ProcessState)
    );
    state.value.processes.push(process);
    plannedProcessTemplate.value = "";
  }
};

const reset = () => {
  stop();
  state.value = {
    processes: state.value.processes.map((e) => ({
      ...makeProcesses(e.priority, e.next),
      uuid: e.uuid,
    })),
    queue: [],
    queues: {},
  };
};

onBeforeUnmount(stop);

const saveAsImage = async () => {
  const blob = await domtoimage.toBlob(document.querySelector("table"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "table.png";
  a.click();
};
</script>

<template>
  <div id="scheduling-alghoritms">
    <h1>Scheduling Alghoritms</h1>

    <div class="table-wrapper" ref="tableWrapper">
      <table>
        <thead>
          <tr>
            <th class="index-cell" />
            <th v-for="process in stateProceses">
              <div>
                {{ process.uuid }}
                ({{ process.priority }})

                <button @click="removeProcess(process)">x</button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(processes, i) in history">
            <td class="index-cell">
              {{ i + 1 }}
            </td>
            <td
              v-for="[processId, processState] in processes"
              :style="{ backgroundColor: processColors[processState] }"
            >
              {{ processState }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="controls">
      <div>
        <div>
          <input
            type="radio"
            id="fcfs"
            name="FCFS"
            value="fcfs"
            v-model="schedulingAlghoritmType"
          />
          <label for="fcfs">FCFS</label>
        </div>
        <div>
          <input
            type="radio"
            id="rr"
            name="Round Robin"
            value="rr"
            v-model="schedulingAlghoritmType"
          />
          <label for="fcfs">Round Robin</label>
        </div>
        <div>
          <input
            type="radio"
            id="mlq"
            name="Multi-Level Queue"
            value="mlq"
            v-model="schedulingAlghoritmType"
          />
          <label for="fcfs">Multi-Level Queue</label>
        </div>
      </div>

      <div>
        <button v-if="updatingInterval" @click="stop">Pause</button>

        <button v-else-if="history.length > 0" @click="start">Resume</button>

        <button v-else @click="start">Start</button>

        <button v-if="history.length > 0" @click="reset">Reset</button>
      </div>

      <div>
        <label for="speed-input"> Speed </label>
        <input type="number" id="speed-input" v-model="speed" />
      </div>

      <div v-if="schedulingAlghoritmType === 'rr'">
        <label for="rr-timeout"> Round Robin Timeout </label>
        <input type="number" id="rr-timeout-input" v-model="rrTimeout" />
      </div>

      <div>
        <button @click="addRandomProcess">Add Random Process</button>
      </div>

      <div>
        <label for="planned-process-input"> Planned Process Template </label>
        <input
          type="text"
          id="planned-process-input"
          v-model="plannedProcessTemplate"
        />
        <br>
        <label for="planned-process-priority-input"> Planned Process Priority </label>
        <input
          type="number"
          min="0"
          max="100"
          id="planned-process-priority-input"
          v-model="plannedProcessPriority"
        />
        <br>
        <button @click="addPlannedProcess">Add Planned Process</button>
      </div>

      <div>
        <button @click="saveAsImage">Save As Image</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
#scheduling-alghoritms {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

h1 {
  margin: 0.8em 0 0.2em 0;
}

.table-wrapper {
  height: 60vh;
  width: 80vw;
  max-width: 1280px;
  overflow: scroll;
  border: 1px solid #213547;
}

.table-wrapper table {
  border-spacing: 0;
  font-family: "Fira Code";
}

.table-wrapper thead {
  z-index: 2;
  position: sticky;
  top: 0;
  left: 0;
  background: white;
  height: 33px;
}

.table-wrapper table th {
  min-width: 96px;
  padding: 4px 8px;
  border-bottom: 1px solid #213547;
  border-right: 1px solid #213547;
  position: relative;
}
.table-wrapper table th > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-wrapper table td {
  min-width: 96px;
  color: white;
  padding: 4px 8px;
  border-bottom: 1px solid #213547;
  border-right: 1px solid #213547;
  text-align: center;
}

.table-wrapper .index-cell {
  position: sticky;
  left: 0;
  background: white;
  color: inherit;
  z-index: 1;
  text-align: right;
  font-weight: bold;
}

.controls {
  width: 40vw;
  display: flex;
  flex-direction: column;
  border: 1px solid #213547;
}
.controls > * {
  padding: 8px 12px;
}

.controls > *:not(:last-child) {
  border-bottom: 1px solid #213547;
}
</style>
