(function () {
  'use strict';

  var input = document.getElementById('search-input');
  var resultsBox = document.getElementById('search-results');
  if (!input || !resultsBox) return;

  var index = null;
  var loading = false;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 命中关键词高亮
  function highlight(text, terms) {
    var html = escapeHtml(text);
    terms.forEach(function (t) {
      if (!t) return;
      var esc = escapeHtml(t);
      var re = new RegExp('(' + esc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      html = html.replace(re, '<mark>$1</mark>');
    });
    return html;
  }

  function search(query) {
    if (!index) return [];
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index
      .map(function (item) {
        var hay = (item.title + ' ' + item.summary + ' ' + item.text).toLowerCase();
        var score = 0;
        var all = true;
        terms.forEach(function (t) {
          if (item.title.toLowerCase().indexOf(t) !== -1) score += 10;
          else if (item.summary.toLowerCase().indexOf(t) !== -1) score += 3;
          else if (item.text.toLowerCase().indexOf(t) !== -1) score += 1;
          else all = false;
        });
        return all ? { item: item, score: score } : null;
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return b.score - a.score || (a.item.date < b.item.date ? 1 : -1);
      })
      .slice(0, 10)
      .map(function (r) {
        return r.item;
      });
  }

  function render(results, terms) {
    if (!results.length) {
      resultsBox.innerHTML = '<div class="sr-empty">没有找到相关内容</div>';
      resultsBox.hidden = false;
      return;
    }
    var html = results
      .map(function (r) {
        return (
          '<a class="search-result" href="' +
          r.url +
          '">' +
          '<div><span class="sr-type">' +
          escapeHtml(r.type) +
          '</span><span class="sr-title">' +
          highlight(r.title, terms) +
          '</span></div>' +
          '<div class="sr-summary">' +
          highlight(r.summary, terms) +
          '</div>' +
          '</a>'
        );
      })
      .join('');
    resultsBox.innerHTML = html;
    resultsBox.hidden = false;
  }

  var timer = null;
  input.addEventListener('input', function () {
    var q = input.value.trim();
    clearTimeout(timer);
    if (!q) {
      resultsBox.hidden = true;
      return;
    }
    timer = setTimeout(function () {
      if (!index && !loading) {
        loading = true;
        fetch('/search.json')
          .then(function (r) {
            return r.json();
          })
          .then(function (data) {
            index = data;
            render(search(q), q.toLowerCase().split(/\s+/).filter(Boolean));
          })
          .catch(function () {
            resultsBox.innerHTML = '<div class="sr-empty">搜索索引加载失败</div>';
            resultsBox.hidden = false;
          })
          .finally(function () {
            loading = false;
          });
      } else if (index) {
        render(search(q), q.toLowerCase().split(/\s+/).filter(Boolean));
      }
    }, 150);
  });

  // 点击外部或按 Esc 关闭
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.search')) resultsBox.hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') resultsBox.hidden = true;
  });
})();
