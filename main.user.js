// ==UserScript==
// @name         GitHub 中文化插件
// @namespace    https://github.com/maboloshi/github-chinese
// @description  中文化 GitHub 界面的部分菜单及内容。原作者为楼教主(http://www.52cik.com/)。
// @copyright    2021, 沙漠之子 (https://maboloshi.github.io/Blog)
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @version      1.9.2-beta.3-2024-06-09
// @author       沙漠之子
// @license      GPL-3.0
// @match        https://github.com/*
// @match        https://skills.github.com/*
// @match        https://gist.github.com/*
// @match        https://www.githubstatus.com/*
// @require      https://raw.githubusercontent.com/maboloshi/github-chinese/Test_zh-CN_LangEnvSet/locals.js?v1.9.0
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_notification
// @connect      www.iflyrec.com
// @supportURL   https://github.com/maboloshi/github-chinese/issues
// ==/UserScript==

(function (window, document, undefined) {
    'use strict';

    const lang = 'zh-CN'; // 设置默认语言
    let page;
    let enable_RegExp = GM_getValue("enable_RegExp", 1);

    /**
     * watchUpdate 函数：监视页面变化，根据变化的节点进行翻译
     */
    function watchUpdate() {
        // 检测浏览器是否支持 MutationObserver
        const MutationObserver =
            window.MutationObserver ||
            window.WebKitMutationObserver ||
            window.MozMutationObserver;

        // 缓存当前页面的 URL
        let previousURL = location.href;

        // 监测 HTML Lang 值, 设置中文环境
        new MutationObserver(mutations => {
            if (document.documentElement.lang === "en") {
                document.documentElement.lang = lang;
            }
        }).observe(document.documentElement, {
            attributeFilter: ['lang']
        });

        // 监听 document.body 下 DOM 变化，用于处理节点变化
        new MutationObserver(mutations => {
            const currentURL = location.href;

            // 如果页面的 URL 发生变化
            if (currentURL !== previousURL) {
                previousURL = currentURL;
                page = getPage();
                console.log(`DOM变化触发: 链接变化 page= ${page}`);
            }

            if (page) {
                // 使用 filter 方法对 mutations 数组进行筛选，
                // 返回 `节点增加、文本更新 或 属性更改的 mutation` 组成的新数组 filteredMutations。
                const filteredMutations = mutations.filter(mutation =>
                    mutation.addedNodes.length > 0 || mutation.type === 'attributes');

                // 处理每个变化
                filteredMutations.forEach(mutation => traverseNode(mutation.target));
            }
        }).observe(document.body, {
            subtree: true,
            childList: true,
            attributeFilter: ['value', 'placeholder', 'aria-label', 'data-confirm'], // 仅观察特定属性变化
        });


        // 监听 Turbo 完成事件
        document.addEventListener('turbo:load', () => {
            if (page) {
                transTitle(); // 翻译页面标题
                transBySelector();
                if (page === "repository") { //仓库简介翻译
                    transDesc(".f4.my-3");
                } else if (page === "gist") { // Gist 简介翻译
                    transDesc(".gist-content [itemprop='about']");
                }
            }
        });
    }

    /**
     * traverseNode 函数：遍历指定的节点，并对节点进行翻译。
     * @param {Node} node - 需要遍历的节点。
     */
    function traverseNode(node) {
        // 跳过忽略
        if (I18N.conf.IgnoreId.includes(node.id) ||
            I18N.conf.reIgnoreClass.test(node.className) ||
            I18N.conf.IgnoreTag.includes(node.tagName) ||
            (node.nodeType === Node.ELEMENT_NODE && I18N.conf.reIgnoreItemprop.test(node.getAttribute("itemprop")))
        ) {
            return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) { // 元素节点处理

            // 翻译时间元素
            if (node.tagName === 'RELATIVE-TIME') {
                transTimeElement(node.shadowRoot);
                return;
            }

            // 元素节点属性翻译
            if (["INPUT", "TEXTAREA"].includes(node.tagName)) { // 输入框 按钮 文本域
                if (["button", "submit", "reset"].includes(node.type)) {
                    if (node.hasAttribute('data-confirm')) { // 翻译 浏览器 提示对话框
                        transElement(node, 'data-confirm', true);
                    }
                    transElement(node, 'value');
                } else {
                    transElement(node, 'placeholder');
                }
            } else if (node.tagName === 'BUTTON') {
                if (node.hasAttribute('aria-label') && /tooltipped/.test(node.className)) {
                    transElement(node, 'aria-label', true); // 翻译 浏览器 提示对话框
                }
                if (node.hasAttribute('title')) {
                    transElement(node, 'title', true); // 翻译 浏览器 提示对话框
                }
                if (node.hasAttribute('data-confirm')) {
                    transElement(node, 'data-confirm', true); // 翻译 浏览器 提示对话框 ok
                }
                if (node.hasAttribute('data-confirm-text')) {
                    transElement(node, 'data-confirm-text', true); // 翻译 浏览器 提示对话框 ok
                }
                if (node.hasAttribute('data-confirm-cancel-text')) {
                    transElement(node, 'data-confirm-cancel-text', true); // 取消按钮 提醒
                }
                if (node.hasAttribute('cancel-confirm-text')) {
                    transElement(node, 'cancel-confirm-text', true); // 取消按钮 提醒
                }
                if (node.hasAttribute('data-disable-with')) { // 按钮等待提示
                    transElement(node, 'data-disable-with', true);
                }
            } else if (node.tagName === 'OPTGROUP') { // 翻译 <optgroup> 的 label 属性
                transElement(node, 'label');
            } else if (/tooltipped/.test(node.className)) { // 仅当 元素存在'tooltipped'样式 aria-label 才起效果
                transElement(node, 'aria-label', true); // 带提示的元素，类似 tooltip 效果的
            } else if (node.tagName === 'A') {
                if (node.hasAttribute('title')) {
                    transElement(node, 'title', true); // 翻译 浏览器 提示对话框
                }
                if (node.hasAttribute('data-hovercard-type')) {
                    return; // 不翻译
                }
            }

            let childNodes = node.childNodes;
            childNodes.forEach(traverseNode); // 遍历子节点

        } else if (node.nodeType === Node.TEXT_NODE) { // 文本节点翻译
            if (node.length <= 500) { // 修复 许可证编辑框初始化载入内容被翻译
                transElement(node, 'data');
            }
        }
    }

    /**
     * getPage 函数：获取页面的类型。
     * @param {URL object} URL - 需要分析的 URL。
     * @returns {string|boolean} 页面的类型，如果无法确定类型，那么返回 false。
     */
    function getPage(url = window.location) {

        // 站点，如 gist, developer, help 等，默认主站是 github
        const siteMapping = {
            'gist.github.com': 'gist',
            'www.githubstatus.com': 'status',
            'skills.github.com': 'skills'
        };
        const site = siteMapping[url.hostname] || 'github'; // 站点
        const pathname = url.pathname; // 当前路径

        // 是否登录
        const isLogin = document.body.classList.contains("logged-in");
        // 用于确定 个人首页，组织首页，仓库页 然后做判断
        const analyticsLocation = (document.getElementsByName('analytics-location')[0] || {}).content || '';
        // 组织页
        const isOrganization = /\/<org-login>/.test(analyticsLocation) || /^\/(?:orgs|organizations)/.test(pathname);
        // 仓库页
        const isRepository = /\/<user-name>\/<repo-name>/.test(analyticsLocation);

        // 优先匹配 body 的 class
        let page, t = document.body.className.match(I18N.conf.rePageClass);
        if (t) {
            if (t[1] === 'page-profile') {
                let matchResult = url.search.match(/tab=(\w+)/);
                if (matchResult) {
                    page = 'page-profile/' + matchResult[1];
                } else {
                    page = pathname.match(/\/(stars)/) ? 'page-profile/stars' : 'page-profile';
                }
            } else {
                page = t[1];
            }
        } else if (site === 'gist') { // Gist 站点
            page = 'gist';
        } else if (site === 'status') {  // GitHub Status 页面
            page = 'status';
        } else if (site === 'skills') {  // GitHub Skills 页面
            page = 'skills';
        } else if (pathname === '/' && site === 'github') { // github.com 首页
            page = isLogin ? 'page-dashboard' : 'homepage';
        } else if (isRepository) { // 仓库页
            t = pathname.match(I18N.conf.rePagePathRepo);
            page = t ? 'repository/' + t[1] : 'repository';
        } else if (isOrganization) { // 组织页
            t = pathname.match(I18N.conf.rePagePathOrg);
            page = t ? 'orgs/' + (t[1] || t.slice(-1)[0]) : 'orgs';
        } else {
            t = pathname.match(I18N.conf.rePagePath);
            page = t ? (t[1] || t.slice(-1)[0]) : false; // 取页面 key
        }

        if (!page || !I18N[lang][page]) {
            console.log(`请注意对应 page ${page} 词库节点不存在`);
            page = false;
        }
        return page;
    }

    /**
     * transTitle 函数：翻译页面标题
     */
    function transTitle() {
        let key = document.title; // 标题文本内容
        let str = I18N[lang]['title']['static'][key] || '';
        if (!str) {
            let res = I18N[lang]['title'].regexp || [];
            for (let [a, b] of res) {
                str = key.replace(a, b);
                if (str !== key) {
                    break;
                }
            }
        }
        document.title = str;
    }

    /**
     * transTimeElement 函数：翻译时间元素文本内容。
     * @param {Element} el - 需要翻译的元素。
     */
    function transTimeElement(el) {
        let key = el.childNodes.length > 0 ? el.lastChild.textContent : el.textContent;
        let res = I18N[lang]['pubilc']['time-regexp']; // 时间正则规则

        for (let [a, b] of res) {
            let str = key.replace(a, b);
            if (str !== key) {
                el.textContent = str;
                break;
            }
        }
    }

    /**
     * transElement 函数：翻译指定元素的文本内容或属性。
     * @param {Element} el - 需要翻译的元素。
     * @param {string} field - 需要翻译的文本内容或属性的名称。
     * @param {boolean} isAttr - 是否需要翻译属性。
     */
    function transElement(el, field, isAttr = false) {
        let text = isAttr ? el.getAttribute(field) : el[field]; // 需要翻译的文本
        let str = translateText(text); // 翻译后的文本

        // 替换翻译后的内容
        if (str) {
            if (!isAttr) {
                el[field] = str;
            } else {
                el.setAttribute(field, str);
            }
        }
    }

    /**
     * translateText 函数：翻译文本内容。
     * @param {string} text - 需要翻译的文本内容。
     * @returns {string|boolean} 翻译后的文本内容，如果没有找到对应的翻译，那么返回 false。
     */
    function translateText(text) { // 翻译

        // 内容为空, 空白字符和或数字, 不存在英文字母和符号,. 跳过
        if (!isNaN(text) || !/[a-zA-Z,.]+/.test(text)) {
            return false;
        }

        let _key = text.trim(); // 去除首尾空格的 key
        let _key_neat = _key.replace(/\xa0|[\s]+/g, ' ') // 去除多余空白字符(&nbsp; 空格 换行符)

        let str = fetchTranslatedText(_key_neat); // 翻译已知页面 (局部优先)

        if (str && str !== _key_neat) { // 已知页面翻译完成
            return text.replace(_key, str); // 替换原字符，保留首尾空白部分
        }

        return false;
    }

    /**
     * fetchTranslatedText 函数：从特定页面的词库中获得翻译文本内容。
     * @param {string} key - 需要翻译的文本内容。
     * @returns {string|boolean} 翻译后的文本内容，如果没有找到对应的翻译，那么返回 false。
     */
    function fetchTranslatedText(key) {

        // 静态翻译
        let str = I18N[lang][page]['static'][key] || I18N[lang]['pubilc']['static'][key]; // 默认翻译 公共部分

        if (typeof str === 'string') {
            return str;
        }

        // 正则翻译
        if (enable_RegExp) {
            let res = (I18N[lang][page].regexp || []).concat(I18N[lang]['pubilc'].regexp || []); // 正则数组

            for (let [a, b] of res) {
                str = key.replace(a, b);
                if (str !== key) {
                    return str;
                }
            }
        }

        return false; // 没有翻译条目
    }

    /**
     * transDesc 函数：为指定的元素添加一个翻译按钮，并为该按钮添加点击事件。
     * @param {string} el - CSS选择器，用于选择需要添加翻译按钮的元素。
     */
    function transDesc(el) {
        // 使用 CSS 选择器选择元素
        let element = document.querySelector(el);

        // 如果元素不存在 或者 translate-me 元素已存在，那么直接返回
        if (!element || document.getElementById('translate-me')) {
            return false;
        }

        // 在元素后面插入一个翻译按钮
        const buttonHTML = `<div id='translate-me' style='color: rgb(27, 149, 224); font-size: small; cursor: pointer'>翻译</div>`;
        element.insertAdjacentHTML('afterend', buttonHTML);
        let button = element.nextSibling;

        // 为翻译按钮添加点击事件
        button.addEventListener('click', () => {
            // 获取元素的文本内容
            const desc = element.textContent.trim();

            // 如果文本内容为空，那么直接返回
            if (!desc) {
                return false;
            }

            // 调用 translateDescText 函数进行翻译
            translateDescText(desc, text => {
                // 翻译完成后，隐藏翻译按钮，并在元素后面插入翻译结果
                button.style.display = "none";
                const translationHTML = `<span style='font-size: small'>由 <a target='_blank' style='color:rgb(27, 149, 224);' href='https://www.iflyrec.com/html/translate.html'>讯飞听见</a> 翻译👇</span><br/>${text}`;
                element.insertAdjacentHTML('afterend', translationHTML);
            });
        });
    }

    /**
     * translateDescText 函数：将指定的文本发送到讯飞的翻译服务进行翻译。
     * @param {string} text - 需要翻译的文本。
     * @param {function} callback - 翻译完成后的回调函数，该函数接受一个参数，即翻译后的文本。
     */
    function translateDescText(text, callback) {
        // 使用 GM_xmlhttpRequest 函数发送 HTTP 请求
        GM_xmlhttpRequest({
            method: "POST", // 请求方法为 POST
            url: "https://www.iflyrec.com/TranslationService/v1/textTranslation", // 请求的 URL
            headers: { // 请求头
                'Content-Type': 'application/json',
                'Origin': 'https://www.iflyrec.com',
            },
            data: JSON.stringify({
                "from": "2",
                "to": "1",
                "contents": [{
                    "text": text,
                    "frontBlankLine": 0
                }]
            }), // 请求的数据
            responseType: "json", // 响应的数据类型为 JSON
            onload: (res) => {
                try {
                    const { status, response } = res;
                    const translatedText = (status === 200) ? response.biz[0].translateResult : "翻译失败";
                    callback(translatedText);
                } catch (error) {
                    console.error('翻译失败', error);
                    callback("翻译失败");
                }
            },
            onerror: (error) => {
                console.error('网络请求失败', error);
                callback("网络请求失败");
            }
        });
    }

    /**
     * transBySelector 函数：通过 CSS 选择器找到页面上的元素，并将其文本内容替换为预定义的翻译。
     */
    function transBySelector() {
        // 获取当前页面的翻译规则，如果没有找到，那么使用公共的翻译规则
        let res = (I18N[lang][page]?.selector || []).concat(I18N[lang]['pubilc'].selector || []); // 数组

        // 如果找到了翻译规则
        if (res.length > 0) {
            // 遍历每个翻译规则
            for (let [selector, translation] of res) {
                // 使用 CSS 选择器找到对应的元素
                let element = document.querySelector(selector)
                // 如果找到了元素，那么将其文本内容替换为翻译后的文本
                if (element) {
                    element.textContent = translation;
                }
            }
        }
    }

    function registerMenuCommand() {
        const toggleRegExp = () => {
            enable_RegExp = !enable_RegExp;
            GM_setValue("enable_RegExp", enable_RegExp);
            GM_notification(`已${enable_RegExp ? '开启' : '关闭'}正则功能`);
            if (enable_RegExp) {
                location.reload();
            }
            GM_unregisterMenuCommand(id);
            id = GM_registerMenuCommand(`${enable_RegExp ? '关闭' : '开启'}正则功能`, toggleRegExp);
        };

        let id = GM_registerMenuCommand(`${enable_RegExp ? '关闭' : '开启'}正则功能`, toggleRegExp);
    }

    /**
     * init 函数：初始化翻译功能。
     */
    function init() {
        // 获取当前页面的翻译规则
        page = getPage();
        console.log(`开始page= ${page}`);

        // 翻译页面标题
        transTitle();

        if (page) {
            // 立即翻译页面
            traverseNode(document.body);

            // 使用 CSS 选择器找到页面上的元素，并将其文本内容替换为预定义的翻译
            transBySelector();
            if (page === "repository") { //仓库简介翻译
                transDesc(".f4.my-3");
            } else if (page === "gist") { // Gist 简介翻译
                transDesc(".gist-content [itemprop='about']");
            }
        }

        // 监视页面变化
        watchUpdate();
    }

    // 执行初始化
    registerMenuCommand();

    // 设置中文环境
    document.documentElement.lang = 'zh-CN';

    // 在页面初始加载完成时执行
    window.addEventListener('DOMContentLoaded', init);

})(window, document);
