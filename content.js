class TabShepherdKeyHandler {
    static __init() {
        TabShepherdKeyHandler.onShow = () => {}
        TabShepherdKeyHandler.onHide = () => {}
        TabShepherdKeyHandler.onArrowRight = () => {}
        TabShepherdKeyHandler.onArrowLeft = () => {}
        TabShepherdKeyHandler.onArrowUp = () => {}
        TabShepherdKeyHandler.onArrowDown = () => {}                

        TabShepherdKeyHandler.__wasShowed = false
        TabShepherdKeyHandler.arrowHandlerMap = {
            ArrowUp: () => TabShepherdKeyHandler.onArrowUp(),
            ArrowDown: () => TabShepherdKeyHandler.onArrowDown(),            
            ArrowLeft: () => TabShepherdKeyHandler.onArrowLeft(),
            ArrowRight: () => TabShepherdKeyHandler.onArrowRight()
        }

        window.addEventListener('keydown', TabShepherdKeyHandler.__documentOnKeyDown, true)
        window.addEventListener('keyup', TabShepherdKeyHandler.__documentOnKeyUp, true)
    }

    static __documentOnKeyDown(e) {
        if (e.code === "Backquote" && e.ctrlKey === true && !TabShepherdKeyHandler.__wasShowed) {
            TabShepherdKeyHandler.__wasShowed = true
            TabShepherdKeyHandler.onShow()
            e.stopPropagation()
        }

        if (TabShepherdKeyHandler.__wasShowed && e.code === "Backquote") {
            if (e.shiftKey)
                TabShepherdKeyHandler.onArrowLeft()
            else
                TabShepherdKeyHandler.onArrowRight()

            e.stopPropagation()
        }

        if (TabShepherdKeyHandler.__wasShowed && TabShepherdKeyHandler.arrowHandlerMap[e.code]) {
            TabShepherdKeyHandler.arrowHandlerMap[e.code]()
            e.stopPropagation()
        }
    }

    static __documentOnKeyUp(e) {
        if (TabShepherdKeyHandler.__wasShowed &&  e.key === "Control") {
            TabShepherdKeyHandler.__wasShowed = false
            TabShepherdKeyHandler.onHide()
        }
    }
}
TabShepherdKeyHandler.__init()

/*
    TODO 
        - screenShot.height вычислять на основании TAB_ITEM_WIDTH и размера окна
        - подобрать огненный шрифт
        - переписать это говно на риакт (c Webpack-окм кончено)
        - дефолтный favicon и screenShot
        - что-то сделать со скринами... мелко не видно ничего?
        - выравнить title по середине favicon-а?
        - что делать если вкладок слишком много ?)
        - строка детализации полный url или title ?)
        - подумать над установкой (обновить все вкладки или фоном выполнить скрипт или...)
        - баг selectedTab всегда должна быть самой первой =) 
*/

const TAB_ITEM_WIDTH = 256
const TAB_ITEM_BORDER_WIDTH = 2

let tabs = undefined
let rowLength = undefined
let selectedIndex = undefined

let iframe = document.createElement('iframe')
iframe.style.cssText = `
    position: fixed;
    top: 5%;
    left: 5%;
    width: 90%;
    height: 90%;
    z-index: 2147483647;
    background: rgba(128, 128, 128, 0.7);
    /*border: 0;*/
    border-radius: 15px;
`

let style = document.createElement('style');
style.type = 'text/css';
style.appendChild(document.createTextNode(`
    .loader {
        border: 16px solid #f3f3f3;
        border-radius: 50%;
        border-top: 16px solid #3498db;
        width: 120px;
        height: 120px;  
        animation: spin 2s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .tab-list {
        width: 100%;
        height: 100%;
    
        display: flex;
        flex-direction: row;                
        flex-wrap: wrap;                    /* Переносить элементы wrap или нет nowrap (еще бывыает wrap-reverse) */
        justify-content: space-around;      /* выравнивает flex-элементы по главной оси текущей строки flex-контейнера */
        align-items: center;                /* Flex-ЭЛЕМЕНТЫ могут быть выровнены вдоль поперечной оси текущей строки flex-контейнера, подобно justify-content, но в перпендикулярном направлении.*/
        align-content: space-around;        /* Выравнивает СТРОКИ flex-контейнера во flex-контейнере, когда есть дополнительное пространство по поперечной оси, подобно тому,  как justify-content выравнивает отдельные элементы по главной оси. */   
    
        background:  rgba(0, 0, 0, 0.0);    
    }

    .tab-item {
        background: rgba(0, 0, 0, 0.0);
        width: ${TAB_ITEM_WIDTH}px;
        border: ${TAB_ITEM_BORDER_WIDTH}px solid black;
        border-radius: 15px;
        margin: 10px;
    }

    .tab-item.selected {
        border-color: white;
    }

    .title-container {
        background: #cecece;
        /*border-bottom: 1px solid black;*/
        border-radius: 15px 15px 0px 0px;
        padding: 3%;
        white-space: nowrap;        /* Запрещаем перенос строк */
        overflow: hidden;           /* Обрезаем все, что не помещается в область */
        text-overflow: ellipsis;    /* Добавляем многоточие */
    }

    .tab-item.selected .title-container {
        background: white;
    }

    .favicon {
        margin-right: 4px;
    }

    .screen-shot {
        border-radius: 0px 0px 15px 15px;
    }
    
`));

let loader = document.createElement('div')
loader.classList.add('loader')

let tabList = document.createElement('div')
tabList.classList.add('tab-list')

iframe.onload = function() {    
    iframe.contentDocument.getElementsByTagName("head")[0].appendChild(style);    
    iframe.contentDocument.body.appendChild(tabList)    
    tabList.appendChild(loader);

    chrome.runtime.sendMessage(chrome.runtime.id, {getTabs: true}, (response) => {        
        tabs = response
        tabList.removeChild(loader)
        tabs.forEach((tab, index) => tabList.appendChild(createTabItem(tab, index)))
        selectNewTabItem(tabList.children.length > 1 ? 1 : 0)        
        calculateRowLength()
    });                            
};

TabShepherdKeyHandler.onShow = () => activateTabShepherd()
TabShepherdKeyHandler.onHide  = () => switchBrowserTab()
TabShepherdKeyHandler.onArrowRight = () => selectNextTab() 
TabShepherdKeyHandler.onArrowLeft = () => selectPreviousTab() 
TabShepherdKeyHandler.onArrowUp = () => selectTabOnPreviousRow()
TabShepherdKeyHandler.onArrowDown = () => selectTabOnNextRow()

function activateTabShepherd() {
    document.body.appendChild(iframe)
}

function switchBrowserTab() {
    tabList.innerHTML = ''
    document.body.removeChild(iframe)
    if (tabs && tabs[selectedIndex])
        setTimeout(() => chrome.runtime.sendMessage(chrome.runtime.id, { selectedTabId: tabs[selectedIndex].id }), 100)
}

function selectNextTab() {
    selectNewTabItem(selectedIndex + 1)
}

function selectPreviousTab() {
    selectNewTabItem(selectedIndex - 1)
}

function selectTabOnPreviousRow() {
    let end = (Math.floor((selectedIndex) / rowLength)) * rowLength - 1
    let start = end - rowLength >= 0 ? end - rowLength : 0
    let newIndex = findClosestTab(start, end)
    newIndex !== undefined && selectNewTabItem(newIndex)
}

function selectTabOnNextRow() {
    let start = (Math.floor((selectedIndex) / rowLength) + 1) * rowLength
    let end = start + rowLength < tabs.length ? start + rowLength : tabs.length - 1 
    let newIndex = findClosestTab(start, tabs.length - 1)
    newIndex !== undefined && selectNewTabItem(newIndex)
}

function selectNewTabItem(index) {
    let newSelectedTabItem = tabList.children[index]
    if (!newSelectedTabItem)
        return

    let selectedTabItem = tabList.children[selectedIndex]
    if (selectedTabItem) 
        selectedTabItem.classList.remove('selected')

    newSelectedTabItem.classList.add('selected')
    selectedIndex = index    
}

function findClosestTab(start, end) {
    if (start < 0 || start >= tabs.length || end < 0 || end >= tabs.length || start > end)
        return

    let index, 
        distance = Number.MAX_VALUE,
        selectedRect = tabList.children[selectedIndex].getBoundingClientRect()

    for (let i = start; i <= end; i++) {
        let rect = tabList.children[i].getBoundingClientRect()
        let newDistance = Math.sqrt(Math.pow(selectedRect.left - rect.left, 2) +  Math.pow(selectedRect.top - rect.top, 2))
        if (newDistance < distance) {
            index = i
            distance = newDistance 
        }
    }
    return index
}

function createTabItem(tab, index) {
    let tabItem = document.createElement('div')
    tabItem.classList.add('tab-item')
    tabItem.appendChild(createTitleContainer(tab))
    tabItem.appendChild(createScreenShot(tab))
    tabItem.onclick = () => {
        selectNewTabItem(index)
        switchBrowserTab()
    }      
    return tabItem
}

function createTitleContainer(tab) {
    let container = document.createElement('div')
    container.classList.add('title-container')

    let favicon = document.createElement('img')
    favicon.classList.add('favicon')

    favicon.src = tab.favIconUrl || ""
    favicon.width = 24
    favicon.height = 24
    container.appendChild(favicon)

    let title = document.createElement('span')
    title.innerText = tab.title
    container.appendChild(title)
    
    return container
}

function createScreenShot(tab) {
    let screenShot = document.createElement('img')
    screenShot.classList.add('screen-shot')
    screenShot.src = tab.screenShotDataUrl || ""
    screenShot.width = TAB_ITEM_WIDTH 
    screenShot.height = 128 

    return screenShot
}

function calculateRowLength() {  
    rowLength = Math.floor(iframe.contentDocument.body.offsetWidth / (TAB_ITEM_WIDTH + 2 * TAB_ITEM_BORDER_WIDTH))
}