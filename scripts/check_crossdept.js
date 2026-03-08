var fs = require('fs');
var data = JSON.parse(fs.readFileSync('documnet.json', 'utf8'));
var wts = data.productionPlanShifts[0].workerTasks;
var workers = data._debug.workers;
var taskDepts = data._debug.taskDepts;

var workerDeptMap = {};
for (var w of workers) {
    workerDeptMap[w.id] = w.department;
}

var crossDept = 0;
var sameDept = 0;
var unknown = 0;
for (var wt of wts) {
    var wDept = workerDeptMap[wt.workerId];
    var tDept = taskDepts[wt.taskId];
    if (!wDept || !tDept) {
        unknown++;
        var worker = workers.find(function(w) { return w.id === wt.workerId; });
        console.log('UNKNOWN: ' + (worker ? worker.name : wt.workerId.substring(0,8)) + ' wDept=' + (wDept || 'null') + ' tDept=' + (tDept || 'null') + ' task=' + wt.taskId.substring(0,8));
    } else if (wDept !== tDept) {
        crossDept++;
        var worker = workers.find(function(w) { return w.id === wt.workerId; });
        console.log('CROSS: ' + (worker ? worker.name : wt.workerId.substring(0,8)) + ' wDept=' + wDept.substring(0,8) + ' tDept=' + tDept.substring(0,8) + ' task=' + wt.taskId.substring(0,8));
    } else {
        sameDept++;
    }
}
console.log('\nSame dept: ' + sameDept);
console.log('Cross dept: ' + crossDept);
console.log('Unknown dept: ' + unknown);
console.log('Total: ' + wts.length);

// Workers with no assignments
var assignedWorkers = new Set(wts.map(function(wt) { return wt.workerId; }));
console.log('\nWorkers with assignments: ' + assignedWorkers.size + ' / ' + workers.length);
var idle = workers.filter(function(w) { return !assignedWorkers.has(w.id); });
for (var w of idle) {
    console.log('IDLE: ' + w.name + ' (' + w.id.substring(0,8) + ') dept=' + (w.department || 'null').substring(0,8));
}
