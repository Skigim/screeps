// Reinstantiation of a task object from protoTask data

import { TaskAttack } from '../TaskInstances/task_attack';
import { TaskBuild } from '../TaskInstances/task_build';
import { TaskClaim } from '../TaskInstances/task_claim';
import { TaskDismantle } from '../TaskInstances/task_dismantle';
import { TaskFortify } from '../TaskInstances/task_fortify';
import { TaskGetBoosted } from '../TaskInstances/task_getBoosted';
import { TaskGetRenewed } from '../TaskInstances/task_getRenewed';
import { TaskGoTo } from '../TaskInstances/task_goTo';
import { TaskGoToRoom } from '../TaskInstances/task_goToRoom';
import { TaskHarvest } from '../TaskInstances/task_harvest';
import { TaskHeal } from '../TaskInstances/task_heal';
import { TaskMeleeAttack } from '../TaskInstances/task_meleeAttack';
import { TaskPickup } from '../TaskInstances/task_pickup';
import { TaskRangedAttack } from '../TaskInstances/task_rangedAttack';
import { TaskWithdraw } from '../TaskInstances/task_withdraw';
import { TaskRepair } from '../TaskInstances/task_repair';
import { TaskReserve } from '../TaskInstances/task_reserve';
import { TaskSignController } from '../TaskInstances/task_signController';
import { TaskTransfer } from '../TaskInstances/task_transfer';
import { TaskUpgrade } from '../TaskInstances/task_upgrade';
import { TaskDrop } from '../TaskInstances/task_drop';
import { deref, derefRoomPosition } from './helpers';
import { TaskInvalid } from '../TaskInstances/task_invalid';
import { TaskTransferAll } from '../TaskInstances/task_transferAll';
import { TaskWithdrawAll } from '../TaskInstances/task_withdrawAll';
import { Task } from '../Task';

export function initializeTask(protoTask: protoTask): Task {
    // Retrieve name and target data from the protoTask
    const taskName = protoTask.name;
    const target = deref(protoTask._target.ref);
    let task: Task;

    // Create a task object of the correct type
    switch (taskName) {
        case TaskAttack.taskName:
            task = new TaskAttack(target);
            break;
        case TaskBuild.taskName:
            task = new TaskBuild(target);
            break;
        case TaskClaim.taskName:
            task = new TaskClaim(target);
            break;
        case TaskDismantle.taskName:
            task = new TaskDismantle(target);
            break;
        case TaskDrop.taskName:
            task = new TaskDrop(derefRoomPosition(protoTask._target._pos));
            break;
        case TaskFortify.taskName:
            task = new TaskFortify(target);
            break;
        case TaskGetBoosted.taskName:
            task = new TaskGetBoosted(target, protoTask.data.resourceType as _ResourceConstantSansEnergy);
            break;
        case TaskGetRenewed.taskName:
            task = new TaskGetRenewed(target);
            break;
        case TaskGoTo.taskName:
            task = new TaskGoTo(derefRoomPosition(protoTask._target._pos));
            break;
        case TaskGoToRoom.taskName:
            task = new TaskGoToRoom(protoTask._target._pos.roomName);
            break;
        case TaskHarvest.taskName:
            task = new TaskHarvest(target);
            break;
        case TaskHeal.taskName:
            task = new TaskHeal(target);
            break;
        case TaskMeleeAttack.taskName:
            task = new TaskMeleeAttack(target);
            break;
        case TaskPickup.taskName:
            task = new TaskPickup(target);
            break;
        case TaskRangedAttack.taskName:
            task = new TaskRangedAttack(target);
            break;
        case TaskRepair.taskName:
            task = new TaskRepair(target);
            break;
        case TaskReserve.taskName:
            task = new TaskReserve(target);
            break;
        case TaskSignController.taskName:
            task = new TaskSignController(target);
            break;
        case TaskTransfer.taskName:
            task = new TaskTransfer(target);
            break;
        case TaskTransferAll.taskName:
            task = new TaskTransferAll(target);
            break;
        case TaskUpgrade.taskName:
            task = new TaskUpgrade(target);
            break;
        case TaskWithdraw.taskName:
            task = new TaskWithdraw(target);
            break;
        case TaskWithdrawAll.taskName:
            task = new TaskWithdrawAll(target);
            break;
        default:
            console.log(`Invalid task name: ${taskName}! task.creep: ${protoTask._creep.name}. Deleting from memory!`);
            task = new TaskInvalid(target);
            break;
    }

    // Set the task proto to what is in memory
    task.proto = protoTask;
    // Return it
    return task;
}
