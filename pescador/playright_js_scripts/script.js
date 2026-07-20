(function () {
        var markup = '<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:48px;height:48px;"><path d="M18 3L4 9v10c0 7.73 5.96 14.96 14 16.93C26.04 33.96 32 26.73 32 19V9L18 3z" fill="#f5a623"></path><path d="M14 18l3 3 6-6" stroke="#0d1b2e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
        var selector = 'svg.octicon-mark-github,svg[data-component="Octicon"]'
        var titleText = 'Sign in to Github to continue to Secure Dev Warrior'
        var observerStarted = false
        var run = function (root) {
            if (!root || root.nodeType !== 1) return
            if (root.matches && root.matches(selector)) root.outerHTML = markup
            var list = root.querySelectorAll ? root.querySelectorAll(selector) : []
            for (var i = 0; i < list.length; i += 1) list[i].outerHTML = markup

            var titles = root.querySelectorAll ? root.querySelectorAll('h1') : []
            for (var k = 0; k < titles.length; k += 1) {
                var t = titles[k]
                if (/^\s*Sign in to\b/i.test(t.textContent || '')) t.textContent = titleText
            }
            if (root.matches && root.matches('h1') && /^\s*Sign in to\b/i.test(root.textContent || '')) {
                root.textContent = titleText
            }
        }
        var start = function () {
            var root = document.documentElement || document.body
            if (!root || observerStarted) return
            observerStarted = true
            run(root)
            new MutationObserver(function (m) {
            for (var i = 0; i < m.length; i += 1) {
                for (var j = 0; j < m[i].addedNodes.length; j += 1) run(m[i].addedNodes[j])
            }
            }).observe(root, { childList: true, subtree: true })
        }
        start()
        if (!observerStarted) document.addEventListener('DOMContentLoaded', start)
        if (!observerStarted) setTimeout(start, 0)
    })()
