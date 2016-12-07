const fs = require('fs');

const START_TAG='//BUILD CUT START';
const END_TAG='//BUILD CUT END';

let file = fs.readFileSync('./SockySock.js').toString(); //TODO: Async?
console.log(`Total before: ${file.length}B`);
let out = []; //TODO: Streaming?

let crlf = false;
let lines = file.split('\n');
if(lines[0]&&lines[0][Math.max(lines[0].length-1,0)]==='\r'){
    crlf = true;
    lines = file.split('\r\n'); // Windows
}

console.log(`Before: ${lines.length} lines`);
let ignoring = false;
console.log('Removing Build cuts...');
for(let line of lines){
    if(ignoring){
        if(~line.indexOf(END_TAG)){
            ignoring=false;
            if(line.trim()!==END_TAG)
                out.push(line);
        }
    }else{
        if(~line.indexOf(START_TAG)){
            ignoring=true;
            if(line.trim()!==START_TAG)
                out.push(line);
        }else
            out.push(line);
    }
}
//out=out.filter(line=>line.trim()!='');

console.log(`After: ${out.length} lines`);

let outStr=out.join(crlf?'\r\n':'\n');
console.log(`Total after: ${outStr.length}B`);

fs.writeFileSync('./SockySock.out.js',outStr);