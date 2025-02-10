import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid';

interface Day {
	date: string;
	isCurrentMonth?: boolean;
	isSelected?: boolean;
	isToday?: boolean;
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function getMonthCalendar(year: number, month: number, selectedDate: string | null = null): Day[] {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const today = new Date();

    const totalDays = lastDayOfMonth.getDate();
    const startDay = firstDayOfMonth.getDay(); // 0 = Sunday, 6 = Saturday

    let days: Day[] = [];

    // Fill in previous month's days to align the first day (Sunday-starting week)
    for (let i = 0; i < startDay; i++) {
        const prevDate = new Date(year, month - 1, -i);
        days.unshift({
            date: prevDate.toISOString().split("T")[0],
            isCurrentMonth: false,
            isToday: false,
            isSelected: false,
        });
    }

    // Fill in current month's days
    for (let day = 1; day <= totalDays; day++) {
        const currentDate = new Date(year, month - 1, day);
        days.push({
            date: currentDate.toISOString().split("T")[0],
            isCurrentMonth: true,
            isToday: today.toDateString() === currentDate.toDateString(),
            isSelected: selectedDate 
                ? new Date(selectedDate).toDateString() === currentDate.toDateString() 
                : false,
        });
    }

    // Fill in next month's days to complete a 6x7 grid (42 days)
    while (days.length < 42) {
        const nextDate = new Date(year, month - 1, totalDays + (days.length - startDay) + 1);
        days.push({
            date: nextDate.toISOString().split("T")[0],
            isCurrentMonth: false,
            isToday: false,
            isSelected: false,
        });
    }

    return days;
}

export default function Calendar() {

	const today = new Date();
	const [year, setYear] = useState(today.getFullYear());
	const [month, setMonth] = useState(today.getMonth() + 1);
	const [monthName, setMonthName] = useState('');
	const [days, setDays] = useState<Day[]>([]);

	useEffect(() => {
		const days = getMonthCalendar(year, month);
		setDays(days)
		setMonthName(today.toLocaleString("en-US", { month: "long" })); 
	}, [])

	function handleDayClick(selectedDay: Day) {
		setDays((prevDays) =>
            prevDays.map((day) => ({
                ...day,
                isSelected: day.date === selectedDay.date
            }))
        );
	}

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900">Upcoming meetings</h2>
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-16">
        <div className="mt-10 text-center lg:col-start-8 lg:col-end-13 lg:row-start-1 lg:mt-9 xl:col-start-9">
          <div className="flex items-center text-gray-900">
            <button
              type="button"
              className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Previous month</span>
              <ChevronLeftIcon className="size-5" aria-hidden="true" />
            </button>
            <div className="flex-auto text-sm font-semibold dark:text-white">{monthName} {year}</div>
            <button
              type="button"
              className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Next month</span>
              <ChevronRightIcon className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6 grid grid-cols-7 text-xs/6 text-gray-500">
            <div>S</div>
            <div>M</div>
            <div>T</div>
            <div>W</div>
            <div>T</div>
            <div>F</div>
            <div>S</div>
          </div>
          <div className="isolate mt-2 grid grid-cols-7 gap-px rounded-lg bg-gray-200 text-sm shadow ring-1 ring-gray-200">
            {days.map((day, dayIdx) => (
              <button
                key={day.date}
                type="button"
                className={classNames(
                  'py-1.5 hover:bg-gray-100 focus:z-10',
                  day.isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                  (day.isSelected || day.isToday) && 'font-semibold',
                  day.isSelected && 'text-white',
                  !day.isSelected && day.isCurrentMonth && !day.isToday && 'text-gray-900',
                  !day.isSelected && !day.isCurrentMonth && !day.isToday && 'text-gray-400',
                  day.isToday && !day.isSelected && 'text-indigo-600',
                  dayIdx === 0 && 'rounded-tl-lg',
                  dayIdx === 6 && 'rounded-tr-lg',
                  dayIdx === days.length - 7 && 'rounded-bl-lg',
                  dayIdx === days.length - 1 && 'rounded-br-lg',
                )}
				onClick={() => { handleDayClick(day) }}
              >
                <time
                  dateTime={day.date}
                  className={classNames(
                    'mx-auto flex size-7 items-center justify-center rounded-full',
                    day.isSelected && day.isToday && 'bg-indigo-600',
                    day.isSelected && !day.isToday && 'bg-gray-900',
                  )}
                >
                  {day.date.split('-').pop().replace(/^0/, '')}
                </time>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
