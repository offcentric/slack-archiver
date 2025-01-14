import dateFormat from "date-format";
import addDaysToDate from 'date-fns/addDays';
import format from 'date-fns/format';

export const getDateRange = (start_date:string|Date, end_date:string|Date) => {
    const formatObj:{year:any, month:any, day:any} = {year:"numeric",month:"short",day:"numeric"};
    if(!start_date){
        return null;
    }
    if(typeof start_date === "string"){
        start_date = new Date(start_date);
    }
    if(typeof end_date === "string"){
        end_date = new Date(end_date);
    }
    const dateStart = start_date.toLocaleString('en-GB',formatObj);
    if(!end_date){
        return dateStart;
    }
    const dateEnd = end_date.toLocaleString('en-GB',formatObj);
    if(dateStart === dateEnd){
        return dateStart;
    }
    if(start_date.getMonth() === end_date.getMonth()){
        return start_date.getDate() + ' - ' + dateEnd;
    }
    if(start_date.getFullYear() === end_date.getFullYear()){
        return start_date.toLocaleString('en-GB',{month:"short",day:"numeric"}) + ' - ' + dateEnd;
    }
    return dateStart + ' - ' + dateEnd;
}

export const getDateTime = (dateTime?:string|Date|number|null) => {
    if(!dateTime){
        dateTime = new Date();
    }
    if(typeof dateTime === 'string' || typeof dateTime === 'number'){
        // @ts-ignore
        if(typeof dateTime === 'string' && dateTime == parseFloat(dateTime)){
            dateTime = parseFloat(dateTime)*1000;
        }

        dateTime = new Date(dateTime);
    }
    return dateFormat.asString('yyyy-MM-dd hh:mm:ss.SSS', dateTime);
}

export const getDate = (dateTime?:string|Date|number|null) => {

    if(!dateTime){
        dateTime = new Date();
    }
    if(typeof dateTime === 'string'){
        // need to parse the string since Date() only expects US date formate >:( )
        const matches = dateTime.match(/(0[1-9]|[12][0-9]|3[01])[\/\-](0[1-9]|1[0,1,2])[\/\-]((19|20)\d{2})/)
        if(matches){
            dateTime = new Date(`${matches[3]} ${matches[2]} ${matches[1]}`);
        }else{
            dateTime = new Date(dateTime);
        }
    }else if(typeof dateTime === 'number'){
        dateTime = new Date(dateTime);
    }

    return dateFormat.asString('yyyy-MM-dd', dateTime);
}

export const getNow = () => {
    return getDateTime(new Date());
}

export const getCurrentYear = () => {
    return parseInt(dateFormat.asString('yyyy', new Date()));
}

export const getDateWithoutYear = (dateTime?:string|Date|null) => {
    if(!dateTime){
        dateTime = new Date();
    }
    if(typeof dateTime === 'string'){
        dateTime = new Date(dateTime);
    }
    return dateFormat.asString('MM-dd', dateTime);
}

export const getTime = (dateTime?:string|Date|null) => {
    if(!dateTime){
        dateTime = new Date();
    }
    if(typeof dateTime === 'string'){
        dateTime = new Date(dateTime);
    }
    return dateFormat.asString('hh:mm:ss', dateTime);
}

export const getTimeWithoutSeconds = (dateTime?:string|Date) => {
    if(!dateTime){
        dateTime = new Date();
    }
    if(typeof dateTime === 'string'){
        dateTime = new Date(dateTime);
    }
    return dateFormat.asString('hh:mm', dateTime);
}

export const getTimestampInSeconds = (dateTime?:string|Date) => {
    if(!dateTime){
        dateTime = new Date();
    }
    if(typeof dateTime === 'string'){
        dateTime = new Date(dateTime);
    }
    return Math.floor(dateTime.getTime()/1000)
}

const months = {1:'jan', 2:'feb', 3:'mar', 4:'apr', 5:'may', 6:'jun', 7:'jul', 8:'aug', 9:'sep', 10:'oct', 11:'nov', 12:'dec'}

export const getMonthLabel = (monthNum:number):string => {
    return months[monthNum];
}

export const getMonthFromDate = (dateTime?:string|Date) => {
    if(!dateTime){
        dateTime = new Date();
    }
    if(typeof dateTime === 'string'){
        dateTime = new Date(dateTime);
    }
    return dateFormat.asString('MM', dateTime);
}

export const getMonthIntegerFromLabel = (monthLabel:string) => {
    const flipped = Object.entries(months).reduce((obj, [key, value]) => ({ ...obj, [value]: key }), {});
    return flipped[monthLabel];
}

export const convertMonthLabelsToIntegers = (monthLabels:Array<string>) => {
    const ret:any[] = [];
    monthLabels.forEach((i) => {
        ret.push(getMonthIntegerFromLabel(i));
    })
    return ret;
}

export const addDays = (dateTime:string|Date|null, days:number) : Date => {
    if(!dateTime){
        dateTime = new Date();
    }
    if(typeof dateTime === 'string'){
        dateTime = new Date(dateTime);
    }
    return addDaysToDate(dateTime, days);
}

export const addDaysFormatted = (dateTime:string|Date|null, days:number): string => {
    if(typeof dateTime === 'string'){
        dateTime = new Date(dateTime);
    }
    return format(addDaysToDate(dateTime, days), 'yyyy-MM-dd');
}

export const timeDiff = (dateTime1:string|Date, dateTime2:string|Date, outputUnits:'ms'|'s'|'m'|'h' = 's'):number => {
    if(typeof dateTime1 === 'string'){
        dateTime1 = new Date(dateTime1);
    }
    if(typeof dateTime2 === 'string'){
        dateTime2 = new Date(dateTime2);
    }
    const diff = Math.abs(dateTime2.getTime() - dateTime1.getTime());

    switch(outputUnits){
        case 'h':
            return diff/60/60/1000;
        case 'm':
            return diff/60/1000;
        case 'ms':
            return diff;
        default:
            return diff/1000;
    }

}