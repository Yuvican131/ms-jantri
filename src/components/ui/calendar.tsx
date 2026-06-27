"use client"

import * as React from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns"

type CalendarProps = {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  initialFocus?: boolean
  defaultMonth?: Date
  className?: string
  showOutsideDays?: boolean
}

function Calendar({
  selected,
  onSelect,
  defaultMonth,
  showOutsideDays = true,
}: CalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = React.useState(defaultMonth || selected || today)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const handleSelect = (day: Date) => {
    if (onSelect) {
      onSelect(day)
    }
  }

  return (
    <div className="w-72 bg-[#0d1117] p-3">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center hover:bg-[#1f2937] text-gray-400 transition-colors text-sm"
        >
          ←
        </button>
        <h3 className="text-white text-base font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center hover:bg-[#1f2937] text-gray-400 transition-colors text-sm"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-gray-500 text-xs mb-3">
        {weekDays.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selected && isSameDay(day, selected)
          const isTodayDate = isToday(day)

          return (
            <button
              key={index}
              onClick={() => handleSelect(day)}
              className={`
                h-9 w-9 text-sm font-medium
                transition-all duration-200
                ${!isCurrentMonth && !showOutsideDays ? "invisible" : ""}
                ${!isCurrentMonth && showOutsideDays ? "text-gray-600" : ""}
                ${isCurrentMonth && !isSelected ? "text-gray-300 hover:bg-[#1f2937]" : ""}
                ${isSelected ? "bg-emerald-500/90 text-white shadow-sm shadow-emerald-500/20" : ""}
                ${isTodayDate && !isSelected ? "ring-1 ring-emerald-500/40" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { Calendar }
