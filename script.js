import { machine, useContext, useState } from './my-state-machine.js'

const outputLineClass = 'contact-form-select__item';
const inputLine = document.querySelector('.contact-form-input');
const outputList = document.querySelector('.contact-form-select');

const selectMachine = machine({
    id: 'select',
    initialState: 'sleeping',
    context: {
        inputLine: inputLine,
        outputList: outputList,
        outputData: [],
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
                            setContext({outputData: [], selected: event.innerHTML});
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
                        if (event.length >= 2) {
                            window.fetch(`https://api.hh.ru/suggests/areas?text=${event}`)
                                .then((response) => {
                                    if (response.status !== 200) {
                                        throw new Error('Error while fetching');
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
                            setContext({outputData: [], selected: event.innerHTML});
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
            onEntry: ['cleanSelectList', 'showSelectedItem']
        },
    },
    actions: {
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