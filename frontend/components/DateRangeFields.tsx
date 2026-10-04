'use client';

import {DateRange, rangeForYear, yearOfRange, yearOptions} from '@/lib/dateRange';

interface Props {
    value: DateRange;
    onChange: (next: DateRange) => void;
}

export default function DateRangeFields({value, onChange}: Props) {
    const years = yearOptions();
    const selectedYear = yearOfRange(value);
    return (
        <>
            <label>
                Year
                <select
                    aria-label="Browse by year"
                    value={selectedYear}
                    onChange={(event) => onChange(event.target.value ? rangeForYear(event.target.value) : {dateFrom: '', dateTo: ''})}
                >
                    <option value="">Any year</option>
                    {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
            </label>
            <label>
                From
                <input
                    type="date"
                    aria-label="From date"
                    value={value.dateFrom}
                    max={value.dateTo || undefined}
                    onChange={(event) => onChange({...value, dateFrom: event.target.value})}
                />
            </label>
            <label>
                To
                <input
                    type="date"
                    aria-label="To date"
                    value={value.dateTo}
                    min={value.dateFrom || undefined}
                    onChange={(event) => onChange({...value, dateTo: event.target.value})}
                />
            </label>
        </>
    );
}
