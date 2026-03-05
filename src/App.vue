<script setup>
import { computed, onMounted, ref, watch } from "vue";
import MonthCalendar from "./components/MonthCalendar.vue";
import { addDays, formatCN, parseISODate, toISODate } from "./lib/date";
import { deleteEvent, eventsByDate, getEventsOn, loadEvents, saveEvents, upsertEvent } from "./lib/storage";
import { loadReminderSettings, maybeSendTodayIfMissed, saveReminderSettings, scheduleTomorrowReminder } from "./lib/notify";

const now = new Date();
const anchor = ref(new Date(now.getFullYear(), now.getMonth(), 1));
const selectedDate = ref(toISODate(now));

const events = ref(loadEvents());
watch(
  events,
  (v) => {
    saveEvents(v);
  },
  { deep: true }
);

const eventsMap = computed(() => eventsByDate(events.value));
const selectedEvents = computed(() => getEventsOn(events.value, selectedDate.value));

const form = ref({
  id: "",
  date: selectedDate.value,
  time: "",
  title: "",
  color: "#22c55e",
  notes: ""
});

const searchDate = ref(selectedDate.value);
const searchResults = ref([]);
const searchMsg = ref("");

const reminder = ref(loadReminderSettings());
let cancelTimer = null;

const selectedLabel = computed(() => formatCN(selectedDate.value));

function goPrev() {
  const d = new Date(anchor.value);
  d.setMonth(d.getMonth() - 1);
  anchor.value = d;
}

function goNext() {
  const d = new Date(anchor.value);
  d.setMonth(d.getMonth() + 1);
  anchor.value = d;
}

function goToday() {
  const n = new Date();
  anchor.value = new Date(n.getFullYear(), n.getMonth(), 1);
  selectedDate.value = toISODate(n);
  form.value.date = selectedDate.value;
  searchDate.value = selectedDate.value;
}

function selectDate(isoDate) {
  selectedDate.value = isoDate;
  form.value.date = isoDate;
  searchDate.value = isoDate;
}

function newId() {
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function resetFormForDate(isoDate) {
  form.value = {
    id: "",
    date: isoDate,
    time: "",
    title: "",
    color: "#22c55e",
    notes: ""
  };
}

function editEvent(ev) {
  form.value = { ...ev };
}

function removeEvent(id) {
  if (!confirm("确定删除这条工作档期吗？")) return;
  events.value = deleteEvent(events.value, id);
  if (form.value.id === id) resetFormForDate(selectedDate.value);
  rerunReminderScheduling();
}

function saveForm() {
  const dateOk = parseISODate(form.value.date);
  if (!dateOk) return alert("日期格式不正确");
  if (!form.value.title.trim()) return alert("请填写工作内容/标题");
  const ev = {
    id: form.value.id || newId(),
    date: form.value.date,
    time: (form.value.time || "").trim(),
    title: form.value.title.trim(),
    color: form.value.color || "#22c55e",
    notes: (form.value.notes || "").trim()
  };
  events.value = upsertEvent(events.value, ev);
  resetFormForDate(selectedDate.value);
  rerunReminderScheduling();
}

function clearForm() {
  resetFormForDate(selectedDate.value);
}

function quickSearch() {
  searchMsg.value = "";
  const dt = parseISODate(searchDate.value);
  if (!dt) {
    searchResults.value = [];
    searchMsg.value = "请输入正确日期（YYYY-MM-DD）";
    return;
  }
  const iso = toISODate(dt);
  const list = getEventsOn(events.value, iso);
  searchResults.value = list;
  searchMsg.value = list.length ? `找到 ${list.length} 条档期` : "当天没有档期";
  selectDate(iso);
}

async function enableReminder() {
  reminder.value.enabled = true;
  saveReminderSettings(reminder.value);
  rerunReminderScheduling();
}

function disableReminder() {
  reminder.value.enabled = false;
  saveReminderSettings(reminder.value);
  rerunReminderScheduling();
}

function onReminderTimeChange() {
  saveReminderSettings(reminder.value);
  rerunReminderScheduling();
}

function rerunReminderScheduling() {
  if (cancelTimer) cancelTimer();
  cancelTimer = null;

  if (!reminder.value.enabled) return;
  cancelTimer = scheduleTomorrowReminder({
    events: events.value,
    timeHHMM: reminder.value.time,
    title: "明日拍摄档期提醒"
  });
}

onMounted(async () => {
  await maybeSendTodayIfMissed({
    events: events.value,
    timeHHMM: reminder.value.time,
    title: "明日拍摄档期提醒"
  });
  rerunReminderScheduling();
});

watch(
  () => reminder.value,
  () => {
    saveReminderSettings(reminder.value);
  },
  { deep: true }
);
</script>

<template>
  <div class="container">
    <div class="topbar">
      <div class="brand">
        <h1>陶雨欣宝宝的专属拍摄日程</h1>
        <p>本地保存 · 可标记颜色 · 日期一键查询 · 前一天提醒（尽力）</p>
      </div>
    </div>

    <div class="row">
      <div class="card">
        <div class="cardHeader">
          <div class="cardTitle">
            <h2>日历</h2>
            <span class="hint">点日期查看/添加档期</span>
          </div>
        </div>
        <MonthCalendar
          :anchor="anchor"
          :selected-date="selectedDate"
          :events-by-date="eventsMap"
          @select="selectDate"
          @prev="goPrev"
          @next="goNext"
          @today="goToday"
        />
      </div>

      <div class="card">
        <div class="cardHeader">
          <div class="cardTitle">
            <h2>当天档期</h2>
            <span class="hint">{{ selectedLabel }}（{{ selectedEvents.length }}）</span>
          </div>
          <button class="btn" type="button" @click="resetFormForDate(selectedDate)">新增</button>
        </div>
        <div class="cardBody">
          <div v-if="selectedEvents.length" class="list">
            <div v-for="ev in selectedEvents" :key="ev.id" class="item">
              <div class="itemTop">
                <div class="chip">
                  <span class="dot" :style="{ background: ev.color }" />
                  <div>
                    <div class="title">{{ ev.title }}</div>
                    <div class="meta">{{ ev.time ? ev.time : "全天" }}</div>
                  </div>
                </div>
                <div class="actions">
                  <button class="btn" type="button" @click="editEvent(ev)">编辑</button>
                  <button class="btn btnDanger" type="button" @click="removeEvent(ev.id)">删除</button>
                </div>
              </div>
              <div v-if="ev.notes" class="note">{{ ev.notes }}</div>
            </div>
          </div>
          <div v-else class="muted">当天没有档期，右上角点“新增”。</div>

          <div class="hr"></div>

          <div class="cardTitle" style="margin-bottom: 10px">
            <h2 style="margin: 0; font-size: 14px">添加 / 编辑</h2>
            <span class="hint">颜色可用于区分项目/客户</span>
          </div>

          <div class="split">
            <div class="field">
              <label>日期</label>
              <input class="input" type="date" v-model="form.date" />
            </div>
            <div class="field">
              <label>时间（可选）</label>
              <input class="input" type="time" v-model="form.time" />
            </div>
          </div>

          <div class="field">
            <label>工作内容 / 标题</label>
            <input class="input" type="text" v-model="form.title" placeholder="例：客户A外景拍摄" />
          </div>

          <div class="split">
            <div class="field">
              <label>颜色标记</label>
              <input class="input" type="color" v-model="form.color" />
            </div>
            <div class="field">
              <label>快速切换日期</label>
              <button class="btn" type="button" @click="selectDate(form.date)">跳到此日期</button>
            </div>
          </div>

          <div class="field">
            <label>备注（可选）</label>
            <textarea class="textarea" v-model="form.notes" placeholder="例：地址、联系人、设备清单…" />
          </div>

          <div class="actions">
            <button class="btn btnPrimary" type="button" @click="saveForm">保存</button>
            <button class="btn" type="button" @click="clearForm">清空</button>
          </div>
        </div>
      </div>
    </div>

    <div class="row" style="margin-top: 12px">
      <div class="card">
        <div class="cardHeader">
          <div class="cardTitle">
            <h2>一键查询日期</h2>
            <span class="hint">输入日期即可查看有无档期</span>
          </div>
          <button class="btn btnPrimary" type="button" @click="quickSearch">查询</button>
        </div>
        <div class="cardBody">
          <div class="split">
            <div class="field" style="margin-bottom: 0">
              <label>日期</label>
              <input class="input" type="date" v-model="searchDate" />
            </div>
            <div class="field" style="margin-bottom: 0">
              <label>快捷</label>
              <div class="actions">
                <button class="btn" type="button" @click="searchDate = selectedDate">用已选日期</button>
                <button class="btn" type="button" @click="searchDate = toISODate(addDays(new Date(), 1))">查明天</button>
              </div>
            </div>
          </div>
          <div class="muted" style="margin-top: 10px">{{ searchMsg }}</div>
          <div v-if="searchResults.length" class="list" style="margin-top: 10px">
            <div v-for="ev in searchResults" :key="ev.id" class="item">
              <div class="itemTop">
                <div class="chip">
                  <span class="dot" :style="{ background: ev.color }" />
                  <div>
                    <div class="title">{{ ev.title }}</div>
                    <div class="meta">{{ ev.date }} · {{ ev.time ? ev.time : "全天" }}</div>
                  </div>
                </div>
                <button class="btn" type="button" @click="selectDate(ev.date)">定位</button>
              </div>
              <div v-if="ev.notes" class="note">{{ ev.notes }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="cardHeader">
          <div class="cardTitle">
            <h2>提醒设置</h2>
            <span class="hint">前一天在手机弹窗提醒</span>
          </div>
        </div>
        <div class="cardBody">
          <div class="field">
            <label>提醒时间（每天）</label>
            <input class="input" type="time" v-model="reminder.time" @change="onReminderTimeChange" />
            <div class="note">说明：浏览器通知受系统限制，最可靠方式是“添加到主屏幕”后使用。</div>
          </div>
          <div class="actions">
            <button v-if="!reminder.enabled" class="btn btnPrimary" type="button" @click="enableReminder">开启提醒</button>
            <button v-else class="btn btnDanger" type="button" @click="disableReminder">关闭提醒</button>
          </div>
          <div class="hr"></div>
          <div class="note">
            提醒逻辑：在你设置的时间点检查“明天”是否有档期，有则推送通知。若浏览器不允许后台运行，可能需要你偶尔打开一次
            本页面让计时器重新生效。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
