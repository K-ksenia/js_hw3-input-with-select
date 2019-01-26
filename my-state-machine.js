const machineStack = [];

function safeRunFunction(func, machine, event) {
     machineStack.push([machine, event]);
     func(event);
     machineStack.pop();
}

function runAction(machine, action, event) {
    if (!machine.actions[action]) {
        throw new Error("Trying to run non-existent action " + action);
    }
    safeRunFunction(machine.actions[action], machine, event)
}

function implementAction(machine, action, event) {
     // Проверяем чем является action (массивом, строкой или функцией)
    if (typeof action === "function") {
        action();
    } else if (typeof action === "string") {
        runAction(machine, action, event);
    } else if (Array.isArray(action)) {
        for (let act in action) {
            runAction(machine, action[act], event);
        }
    }
}

function useContext() {
    const [machine, event] = machineStack[machineStack.length-1];
    return [machine.context, newContext => {Object.assign(machine.context, newContext)} ];
}

function useState() {
    const [machine, event] = machineStack[machineStack.length-1];
    return [machine.state,
            newState => {
                if (!machine.states[newState]) {
                    throw new Error("Trying to set non-existent state " + newState);
                }
                implementAction(machine, machine.states[machine.state].onExit, event);
                machine.state = newState;
                implementAction(machine, machine.states[machine.state].onEntry, event);
            }];
}

function machine(stateMachine) {
    const newMachine = {
        id: stateMachine.id,
        state: stateMachine.initialState,
        context: stateMachine.context,
        states: stateMachine.states,
        actions: stateMachine.actions,
        transition(transaction, event) {
            // Проверяем есть ли у текущего состояния блок описания транзакций
            if (this.states[this.state].on) {
                const operation = this.states[this.state].on[transaction];
                // Определяем наличие сервиса и приступаем к выполнению транзакции
                if (operation && operation.service) {
                    safeRunFunction(operation.service, this, event)
                } else if (operation && operation.target) {
                    safeRunFunction(() => {useState()[1](operation.target)}, this, event);
                } else {
                    throw new Error("Transaction " + transaction + " from state "
                        + this.state + " must have service or target property");
                }
            }
        }
    };
    return newMachine;
}

export {machine, useContext, useState}