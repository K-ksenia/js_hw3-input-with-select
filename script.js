import { machine, useContext, useState } from './my-state-machine.js'

const minInputLength = 2;
const target = 'select';

// Пробегаемся по всем элементам и возвращаем тот, у которого data-target равен объявленному target
function findNodeWithTarget(nodes) {
    for (let i in nodes) {
        if (nodes[i].dataset.target === target) {
            return nodes[i];
        }
    }
}

const inputLines = document.querySelectorAll('input');
const outputLists = document.querySelectorAll('ul');
const inputLine = findNodeWithTarget(inputLines);
const outputList = findNodeWithTarget(outputLists);
// Задаем стиль отображаемых li элементов
const outputLineClass = 'contact-form-select__item';


const selectMachine = machine({
    id: 'select',
    initialState: 'sleeping',
    context: {
        inputLine: inputLine,
        outputList: outputList,
        outputData: [],
        selectedId: 0,
        selected: '',
        outputLineClass: outputLineClass
    },
    states: {
        sleeping: {
            on: {
                LISTEN: {target: 'listening'},
                CHOOSE: {
                    service: (event) => {
                        const [context, setContext] = useContext();
                        if (event.id) {
                            setContext({selectedId: event.id});
                            useState()[1]('chosen');
                        }
                    }
                }
            }
        },
        listening: {
            on: {
                CHECK: {
                    service: (event) => {
                        const [state, setState] = useState();
                        const [context, setContext] = useContext();
                        if (event.includes(' ')) {
                            setContext({outputData: ['Строка не должна содержать пробельные символы']});
                        } else if (event.length >= minInputLength) {
                            window.fetch(`https://api.hh.ru/suggests/areas?text=${event}`)
                                .then((response) => {
                                    if (response.status !== 200) {
                                        let error = new Error(response.status);
                                        error.response = response;
                                        throw error;
                                    }
                                    return response.json();
                                })
                                .then((json) => {
                                    if (json.items.length !== 0) {
                                        setContext({outputData: json.items});
                                    } else {
                                        setContext({outputData: ['Совпадений не найдено']});
                                    }
                                    setState('showing');
                                })
                                .catch((err) => {
                                    console.log('Error while fetching: ' + err.message);
                                    console.log(err.response);
                                    setContext({outputData: ['Список временно недоступен, проверьте соединение']});
                                    setState('showing');
                                });
                        } else if (event.length === 0) {
                            setContext({outputData: []});
                        } else {
                            setContext({outputData: ['Для отображения подсказки введите еще хотя бы один символ']});
                        }
                        setState('showing');
                    }
                },
                SLEEP: {target: 'sleeping'},
                CHOOSE: {
                    service: (event) => {
                        const [state, setState] = useState();
                        const [context, setContext] = useContext();
                        if (event.id) {
                            setContext({selectedId: event.id});
                            setState('chosen');
                        } else setState('sleeping');
                    }
                }
            }
        },
        showing: {
            onEntry: ['cleanSelectList','showSelectList'],
        },
        chosen: {
            onEntry: ['prepareData', 'cleanSelectList', 'showSelectedItem']
        },
    },
    actions: {
        prepareData : () => {
            const [context, setContext] = useContext();
            // ищем индекс элемента с полученным id в массиве outputData
            const chosenIndex = context.outputData.findIndex((elem, i, arr) => arr[i].id === context.selectedId);
            setContext({
                selected: context.outputData[chosenIndex].text,
                outputData: []
            });
        },
        cleanSelectList: () => {
            const [context, setContext] = useContext();
            while (context.outputList.firstElementChild) {
	            context.outputList.removeChild(context.outputList.firstElementChild);
	        }
        },
        showSelectList: () => {
            const [context, setContext] = useContext();
            if (context.outputData.length!== 0) {
                for (let i = 0; i < context.outputData.length; i++) {
                    let li = document.createElement("li");
                    if (typeof context.outputData[i] === 'string') {
                        li.appendChild(document.createTextNode(context.outputData[i]));
                    } else {
                        li.appendChild(document.createTextNode(context.outputData[i].text));
                        li.setAttribute('id', context.outputData[i].id);
                        li.setAttribute('tabindex', 0);
                    }
                    li.className = context.outputLineClass;
                    outputList.appendChild(li);
                }
            }
            useState()[1]('listening');
        },
        showSelectedItem: () => {
            const [context, setContext] = useContext();
            context.inputLine.value = context.selected;
            useState()[1]('sleeping');
        }
    },
});

inputLine.addEventListener('focusin', () => {
    selectMachine.transition('LISTEN');
});

inputLine.addEventListener('focusout', () => {
    selectMachine.transition('SLEEP');
});

inputLine.addEventListener('input', () => {
    selectMachine.transition('CHECK', inputLine.value)
});

outputList.addEventListener('click', (e) => {
    selectMachine.transition('CHOOSE', e.target)
});


inputLine.addEventListener('keydown', (e) => {
    if (outputList.childNodes.length !== 0) {
        // Если есть выпавший список, то передвигаемся по нему
        switch (e.key) {
            case 'ArrowDown':
                outputList.firstElementChild.focus();
                break;
            case 'ArrowUp':
                outputList.lastElementChild.focus();
                break;
        }
    } else {
        // Иначе убираем фокус с инпута
        switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Tab':
            inputLine.blur();
            break;
    }
    }
});

outputList.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowDown':
            if (e.target !== outputList.lastElementChild) {
                e.target.nextElementSibling.focus();
            }
            break;
        case 'ArrowUp':
            if (e.target !== outputList.firstElementChild) {
                e.target.previousElementSibling.focus();
            }
            break;
        case 'Enter':
            selectMachine.transition('CHOOSE', e.target);
            break;
    }
});

addEventListener('keydown', (e) => {
    if (e.target !== inputLine && e.target.className !== outputLineClass) {
        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowUp':
            case 'Tab':
                inputLine.focus();
                break;
        }
    }
});