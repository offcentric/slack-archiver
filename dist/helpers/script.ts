import process from "node:process";

export const parseFlags = (args) => {
    const flagsArr = args.slice(3);
    console.log("FLAGS", args);
    const allowedFlags = ['-c','-u','-l'];
    let channel, user, latest = null;

    for(let i=0; i <flagsArr.length; i++){
        const flagName = flagsArr[i];
        if(allowedFlags.includes(flagName)){
            const flagVal = flagsArr[i+1];
            if(!flagVal){
                console.error('MISSING VALUE FOR FLAG '+flagName);
                process.exit(1);
            }else{
                switch(flagName){
                    case '-c':
                        channel = flagVal;
                        break;
                    case '-u':
                        user = flagVal;
                        break;
                    case '-l':
                        latest = flagVal;
                }
                i++;
            }
        }else{
            console.error('UNKNOWN FLAG '+flagName);
            process.exit(1);
        }
    }

    return {channel, user, latest};
}