import process from "node:process";

export const parseFlags = (args) => {
    const flagsArr = args.slice(4);
    const allowedFlags = ['-latest','-limit'];
    let latest, limit = null;

    for(let i=0; i <flagsArr.length; i++){
        const flagName = flagsArr[i];
        if(allowedFlags.includes(flagName)){
            const flagVal = flagsArr[i+1];
            if(!flagVal){
                console.error('MISSING VALUE FOR FLAG '+flagName);
                process.exit(1);
            }else{
                switch(flagName){
                    case '-latest':
                        latest = flagVal;
                        break;
                    case '-limit':
                        limit = parseInt(flagVal);
                        break;
                }
                i++;
            }
        }else{
            console.error('UNKNOWN FLAG '+flagName);
            process.exit(1);
        }
    }
    const ret = {latest, limit};
    return ret;
}