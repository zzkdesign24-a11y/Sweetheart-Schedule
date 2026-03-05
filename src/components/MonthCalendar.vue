<script setup>
import { computed } from "vue";
import { getMonthMatrix, toISODate } from "../lib/date";

const props = defineProps({
  anchor: { type: Date, required: true },
  selectedDate: { type: String, required: true },
  eventsByDate: { type: Object, required: true }
});

const emit = defineEmits(["select", "prev", "next", "today"]);

const weeks = computed(() => getMonthMatrix(props.anchor, true));

const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];

const monthLabel = computed(() => {
  const y = props.anchor.getFullYear();
  const m = props.anchor.getMonth() + 1;
  return `${y}年${m}月`;
});

function isInMonth(dt) {
  return dt.getMonth() === props.anchor.getMonth() && dt.getFullYear() === props.anchor.getFullYear();
}

function dayKey(dt) {
  return toISODate(dt);
}

function select(dt) {
  emit("select", dayKey(dt));
}

function dayEvents(isoDate) {
  return props.eventsByDate.get(isoDate) || [];
}
</script>

<template>
  <div class="cal">
    <div class="calTop">
      <div class="calNav">
        <button class="btn" type="button" @click="emit('prev')">上月</button>
        <button class="btn btnPrimary" type="button" @click="emit('today')">今天</button>
        <button class="btn" type="button" @click="emit('next')">下月</button>
      </div>
      <div class="calLabel">{{ monthLabel }}</div>
    </div>

    <div class="calGrid calWeek">
      <div v-for="w in weekLabels" :key="w" class="calWeekday">{{ w }}</div>
    </div>

    <div class="calGrid calDays">
      <button
        v-for="dt in weeks.flat()"
        :key="dayKey(dt)"
        type="button"
        class="calDay"
        :class="{
          out: !isInMonth(dt),
          selected: dayKey(dt) === selectedDate,
          has: dayEvents(dayKey(dt)).length > 0
        }"
        @click="select(dt)"
      >
        <div class="calNum">{{ dt.getDate() }}</div>
        <div class="calDots" aria-hidden="true">
          <span
            v-for="ev in dayEvents(dayKey(dt)).slice(0, 3)"
            :key="ev.id"
            class="calDot"
            :style="{ background: ev.color }"
          />
          <span v-if="dayEvents(dayKey(dt)).length > 3" class="calMore">+{{ dayEvents(dayKey(dt)).length - 3 }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.cal {
  padding: 14px;
}

.calTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.calNav {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.calLabel {
  font-weight: 650;
  letter-spacing: 0.2px;
}

.calGrid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.calWeekday {
  text-align: center;
  font-size: 12px;
  color: var(--muted);
  padding: 6px 0 2px;
}

.calDay {
  border: 1px solid rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.44);
  border-radius: 14px;
  padding: 10px 8px;
  text-align: left;
  color: inherit;
  cursor: pointer;
  min-height: 62px;
  position: relative;
  overflow: hidden;
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  backdrop-filter: blur(14px) saturate(160%);
  transition: transform 0.05s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.calDay:hover {
  border-color: rgba(236, 72, 153, 0.22);
  background: rgba(255, 255, 255, 0.56);
}

.calDay:active {
  transform: translateY(1px);
}

.calDay.has {
  border-color: rgba(236, 72, 153, 0.22);
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.10), rgba(244, 114, 182, 0.06));
}

.calDay.selected {
  border-color: rgba(236, 72, 153, 0.35);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.18);
}

.calDay.out {
  opacity: 0.45;
}

.calNum {
  font-weight: 650;
  font-size: 13px;
}

.calDots {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.calDot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.10);
}

.calMore {
  font-size: 11px;
  color: var(--muted);
}

@media (prefers-reduced-motion: reduce) {
  .calDay {
    transition: none !important;
  }
}
</style>
