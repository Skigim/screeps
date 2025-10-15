import { Task } from './Task';
import { TaskAttack } from './TaskInstances/task_attack';
import type { attackTargetType } from './TaskInstances/task_attack';
import { TaskBuild } from './TaskInstances/task_build';
import type { buildTargetType } from './TaskInstances/task_build';
import { TaskClaim } from './TaskInstances/task_claim';
import type { claimTargetType } from './TaskInstances/task_claim';
import { TaskDismantle } from './TaskInstances/task_dismantle';
import type { dismantleTargetType } from './TaskInstances/task_dismantle';
import { TaskFortify } from './TaskInstances/task_fortify';
import type { fortifyTargetType } from './TaskInstances/task_fortify';
import { TaskGetBoosted } from './TaskInstances/task_getBoosted';
import type { getBoostedTargetType } from './TaskInstances/task_getBoosted';
import { TaskGetRenewed } from './TaskInstances/task_getRenewed';
import type { getRenewedTargetType } from './TaskInstances/task_getRenewed';
import { TaskGoTo } from './TaskInstances/task_goTo';
import type { goToTargetType } from './TaskInstances/task_goTo';
import { TaskGoToRoom } from './TaskInstances/task_goToRoom';
import type { goToRoomTargetType } from './TaskInstances/task_goToRoom';
import { TaskHarvest } from './TaskInstances/task_harvest';
import type { harvestTargetType } from './TaskInstances/task_harvest';
import { TaskHeal } from './TaskInstances/task_heal';
import type { healTargetType } from './TaskInstances/task_heal';
import { TaskMeleeAttack } from './TaskInstances/task_meleeAttack';
import type { meleeAttackTargetType } from './TaskInstances/task_meleeAttack';
import { TaskPickup } from './TaskInstances/task_pickup';
import type { pickupTargetType } from './TaskInstances/task_pickup';
import { TaskRangedAttack } from './TaskInstances/task_rangedAttack';
import type { rangedAttackTargetType } from './TaskInstances/task_rangedAttack';
import { TaskRepair } from './TaskInstances/task_repair';
import type { repairTargetType } from './TaskInstances/task_repair';
import { TaskReserve } from './TaskInstances/task_reserve';
import type { reserveTargetType } from './TaskInstances/task_reserve';
import { TaskSignController } from './TaskInstances/task_signController';
import type { signControllerTargetType } from './TaskInstances/task_signController';
import { TaskTransfer } from './TaskInstances/task_transfer';
import type { transferTargetType } from './TaskInstances/task_transfer';
import { TaskUpgrade } from './TaskInstances/task_upgrade';
import type { upgradeTargetType } from './TaskInstances/task_upgrade';
import { TaskWithdraw } from './TaskInstances/task_withdraw';
import type { withdrawTargetType } from './TaskInstances/task_withdraw';
import { TaskDrop } from './TaskInstances/task_drop';
import type { dropTargetType } from './TaskInstances/task_drop';
import { TaskTransferAll } from './TaskInstances/task_transferAll';
import type { transferAllTargetType } from './TaskInstances/task_transferAll';
import { TaskWithdrawAll } from './TaskInstances/task_withdrawAll';
import type { withdrawAllTargetType } from './TaskInstances/task_withdrawAll';

export class Tasks {
    /* Tasks.chain allows you to transform a list of tasks into a single task, where each subsequent task in the list
     * is the previous task's parent. SetNextPos will chain Task.nextPos as well, preventing creeps from idling for a
     * tick between tasks. If an empty list is passed, null is returned. */
    static chain(tasks: ITask[], setNextPos = true): ITask | null {
        if (tasks.length === 0) {
            return null;
        }
        if (setNextPos) {
            for (let i = 0; i < tasks.length - 1; i++) {
                tasks[i].options.nextPos = tasks[i + 1].targetPos;
            }
        }
        // Make the accumulator task from the end and iteratively fork it
        let task: Task = _.last(tasks)! as Task; // start with last task
        const remaining = _.dropRight(tasks) as Task[]; // remove it from the list
        for (let i = (remaining.length - 1); i >= 0; i--) { // iterate over the remaining tasks
            task = task.fork(remaining[i]);
        }
        return task;
    }

    static attack(target: attackTargetType, options: TaskOptions = {}): ITask {
        return new TaskAttack(target, options);
    }

    static build(target: buildTargetType, options: TaskOptions = {}): ITask {
        return new TaskBuild(target, options);
    }

    static claim(target: claimTargetType, options: TaskOptions = {}): ITask {
        return new TaskClaim(target, options);
    }

    static dismantle(target: dismantleTargetType, options: TaskOptions = {}): ITask {
        return new TaskDismantle(target, options);
    }

    static drop(target: dropTargetType, resourceType: ResourceConstant = RESOURCE_ENERGY, amount: number | undefined = undefined, options: TaskOptions = {}): ITask {
        return new TaskDrop(target, resourceType, amount, options);
    }

    static fortify(target: fortifyTargetType, options: TaskOptions = {}): ITask {
        return new TaskFortify(target, options);
    }

    static getBoosted(target: getBoostedTargetType, boostType: _ResourceConstantSansEnergy, amount: number | undefined = undefined, options: TaskOptions = {}): ITask {
        return new TaskGetBoosted(target, boostType, amount, options);
    }

    static getRenewed(target: getRenewedTargetType, options: TaskOptions = {}): ITask {
        return new TaskGetRenewed(target, options);
    }

    static goTo(target: goToTargetType, options: TaskOptions = {}): ITask {
        return new TaskGoTo(target, options);
    }

    static goToRoom(target: goToRoomTargetType, options: TaskOptions = {}): ITask {
        return new TaskGoToRoom(target, options);
    }

    static harvest(target: harvestTargetType, options: TaskOptions = {}): ITask {
        return new TaskHarvest(target, options);
    }

    static heal(target: healTargetType, options: TaskOptions = {}): ITask {
        return new TaskHeal(target, options);
    }

    static meleeAttack(target: meleeAttackTargetType, options: TaskOptions = {}): ITask {
        return new TaskMeleeAttack(target, options);
    }

    static pickup(target: pickupTargetType, options: TaskOptions = {}): ITask {
        return new TaskPickup(target, options);
    }

    static rangedAttack(target: rangedAttackTargetType, options: TaskOptions = {}): ITask {
        return new TaskRangedAttack(target, options);
    }

    static repair(target: repairTargetType, options: TaskOptions = {}): ITask {
        return new TaskRepair(target, options);
    }

    static reserve(target: reserveTargetType, options: TaskOptions = {}): ITask {
        return new TaskReserve(target, options);
    }

    static signController(target: signControllerTargetType, signature: string, options: TaskOptions = {}): ITask {
        return new TaskSignController(target, signature, options);
    }

    static transfer(target: transferTargetType, resourceType: ResourceConstant = RESOURCE_ENERGY, amount: number | undefined = undefined, options: TaskOptions = {}): ITask {
        return new TaskTransfer(target, resourceType, amount, options);
    }

    static transferAll(target: transferAllTargetType, skipEnergy = false, options: TaskOptions = {}): ITask {
        return new TaskTransferAll(target, skipEnergy, options);
    }

    static upgrade(target: upgradeTargetType, options: TaskOptions = {}): ITask {
        return new TaskUpgrade(target, options);
    }

    static withdraw(target: withdrawTargetType, resourceType: ResourceConstant = RESOURCE_ENERGY, amount: number | undefined = undefined, options: TaskOptions = {}): ITask {
        return new TaskWithdraw(target, resourceType, amount, options);
    }

    static withdrawAll(target: withdrawAllTargetType, options: TaskOptions = {}): ITask {
        return new TaskWithdrawAll(target, options);
    }
}
