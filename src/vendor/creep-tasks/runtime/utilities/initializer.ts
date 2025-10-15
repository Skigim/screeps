// Reinstantiation of a task object from protoTask data

import { TaskAttack, attackTargetType } from '../TaskInstances/task_attack';
import { TaskBuild, buildTargetType } from '../TaskInstances/task_build';
import { TaskClaim, claimTargetType } from '../TaskInstances/task_claim';
import { TaskDismantle, dismantleTargetType } from '../TaskInstances/task_dismantle';
import { TaskFortify, fortifyTargetType } from '../TaskInstances/task_fortify';
import { TaskGetBoosted, getBoostedTargetType } from '../TaskInstances/task_getBoosted';
import { TaskGetRenewed, getRenewedTargetType } from '../TaskInstances/task_getRenewed';
import { TaskGoTo } from '../TaskInstances/task_goTo';
import { TaskGoToRoom } from '../TaskInstances/task_goToRoom';
import { TaskHarvest, harvestTargetType } from '../TaskInstances/task_harvest';
import { TaskHeal, healTargetType } from '../TaskInstances/task_heal';
import { TaskMeleeAttack, meleeAttackTargetType } from '../TaskInstances/task_meleeAttack';
import { TaskPickup, pickupTargetType } from '../TaskInstances/task_pickup';
import { TaskRangedAttack, rangedAttackTargetType } from '../TaskInstances/task_rangedAttack';
import { TaskWithdraw, withdrawTargetType } from '../TaskInstances/task_withdraw';
import { TaskRepair, repairTargetType } from '../TaskInstances/task_repair';
import { TaskReserve, reserveTargetType } from '../TaskInstances/task_reserve';
import { TaskSignController, signControllerTargetType } from '../TaskInstances/task_signController';
import { TaskTransfer, transferTargetType } from '../TaskInstances/task_transfer';
import { TaskUpgrade, upgradeTargetType } from '../TaskInstances/task_upgrade';
import { TaskDrop } from '../TaskInstances/task_drop';
import { deref, derefRoomPosition } from './helpers';
import { TaskInvalid } from '../TaskInstances/task_invalid';
import { TaskTransferAll, transferAllTargetType } from '../TaskInstances/task_transferAll';
import { TaskWithdrawAll, withdrawAllTargetType } from '../TaskInstances/task_withdrawAll';
import { Task } from '../Task';

export function initializeTask(protoTask: protoTask): Task {
    // Retrieve name and target data from the protoTask
    const taskName = protoTask.name;
    const target = deref(protoTask._target.ref);
    let task: Task;

    // Create a task object of the correct type
    switch (taskName) {
        case TaskAttack.taskName:
            task = target ? new TaskAttack(target as attackTargetType) : new TaskInvalid(target);
            break;
        case TaskBuild.taskName:
            task = target ? new TaskBuild(target as buildTargetType) : new TaskInvalid(target);
            break;
        case TaskClaim.taskName:
            task = target ? new TaskClaim(target as claimTargetType) : new TaskInvalid(target);
            break;
        case TaskDismantle.taskName:
            task = target ? new TaskDismantle(target as dismantleTargetType) : new TaskInvalid(target);
            break;
        case TaskDrop.taskName:
            task = new TaskDrop(derefRoomPosition(protoTask._target._pos));
            break;
        case TaskFortify.taskName:
            task = target ? new TaskFortify(target as fortifyTargetType) : new TaskInvalid(target);
            break;
        case TaskGetBoosted.taskName:
            task = target ? new TaskGetBoosted(target as getBoostedTargetType, protoTask.data.resourceType as _ResourceConstantSansEnergy) : new TaskInvalid(target);
            break;
        case TaskGetRenewed.taskName:
            task = target ? new TaskGetRenewed(target as getRenewedTargetType) : new TaskInvalid(target);
            break;
        case TaskGoTo.taskName:
            task = new TaskGoTo(derefRoomPosition(protoTask._target._pos));
            break;
        case TaskGoToRoom.taskName:
            task = new TaskGoToRoom(protoTask._target._pos.roomName);
            break;
        case TaskHarvest.taskName:
            task = target ? new TaskHarvest(target as harvestTargetType) : new TaskInvalid(target);
            break;
        case TaskHeal.taskName:
            task = target ? new TaskHeal(target as healTargetType) : new TaskInvalid(target);
            break;
        case TaskMeleeAttack.taskName:
            task = target ? new TaskMeleeAttack(target as meleeAttackTargetType) : new TaskInvalid(target);
            break;
        case TaskPickup.taskName:
            task = target ? new TaskPickup(target as pickupTargetType) : new TaskInvalid(target);
            break;
        case TaskRangedAttack.taskName:
            task = target ? new TaskRangedAttack(target as rangedAttackTargetType) : new TaskInvalid(target);
            break;
        case TaskRepair.taskName:
            task = target ? new TaskRepair(target as repairTargetType) : new TaskInvalid(target);
            break;
        case TaskReserve.taskName:
            task = target ? new TaskReserve(target as reserveTargetType) : new TaskInvalid(target);
            break;
        case TaskSignController.taskName:
            task = target ? new TaskSignController(target as signControllerTargetType) : new TaskInvalid(target);
            break;
        case TaskTransfer.taskName:
            task = target ? new TaskTransfer(target as transferTargetType) : new TaskInvalid(target);
            break;
        case TaskTransferAll.taskName:
            task = target ? new TaskTransferAll(target as transferAllTargetType) : new TaskInvalid(target);
            break;
        case TaskUpgrade.taskName:
            task = target ? new TaskUpgrade(target as upgradeTargetType) : new TaskInvalid(target);
            break;
        case TaskWithdraw.taskName:
            task = target ? new TaskWithdraw(target as withdrawTargetType) : new TaskInvalid(target);
            break;
        case TaskWithdrawAll.taskName:
            task = target ? new TaskWithdrawAll(target as withdrawAllTargetType) : new TaskInvalid(target);
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
