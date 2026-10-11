/* Read-only, paginated DOM rendering for LoadoutCore.compareItems() results. */
(function(root) {
  'use strict';
  const PAGE_SIZE = 50;
  const metrics = ['weight', 'volume', 'quantity', 'rows'];
  const fields = ['name', 'category', 'purpose_short', 'quantity', 'recommended_quantity', 'checked', 'weight_g', 'volume_cm3'];

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }

  function unit(field) {
    if (field === 'weight' || field === 'weight_g') return ' g';
    if (field === 'volume' || field === 'volume_cm3') return ' cm³';
    return '';
  }

  function fieldValue(item, field, lang) {
    if (field === 'checked') return t(item.checked ? 'comparison.checked' : 'comparison.unchecked');
    if (['name', 'category', 'purpose_short'].includes(field)) return LoadoutCore.localized(item, field, lang);
    const translated = /^(name|category|purpose_short)_(ja|en)$/.exec(field);
    if (translated) return LoadoutCore.localized(item, translated[1], translated[2]);
    return String(item[field]);
  }

  function fieldLabel(field) {
    const translated = /^(name|category|purpose_short)_(ja|en)$/.exec(field);
    return translated ? t('comparison.field.' + translated[1]) + ' (' + translated[2].toUpperCase() + ')'
      : t('comparison.field.' + field);
  }

  function renderStats(result) {
    const fragment = document.createDocumentFragment();
    for (const metric of metrics) {
      const card = element('article', undefined, 'comparison-metric');
      card.dataset.metric = metric;
      card.append(element('h4', t('comparison.metric.' + metric)));
      const values = element('dl');
      for (const side of ['reference', 'current', 'delta']) {
        const value = side === 'delta' ? result.delta[metric] : result[side + 'Totals'][metric];
        const formatted = (side === 'delta' && value > 0 ? '+' : '') + String(value) + unit(metric);
        const definition = element('dd', formatted);
        definition.dataset.side = side;
        values.append(element('dt', t('comparison.' + side)), definition);
      }
      card.append(values);
      fragment.append(card);
    }
    document.getElementById('comparisonStats').replaceChildren(fragment);
  }

  function renderSide(item, side, lang) {
    const section = element('section');
    section.dataset.side = side;
    section.append(element('h5', t('comparison.' + side)));
    if (!item) {
      const absent = element('p', t('comparison.absent'));
      absent.dataset.empty = 'true';
      section.append(absent);
      return section;
    }
    const values = element('dl');
    for (const field of fields) {
      const definition = element('dd', fieldValue(item, field, lang));
      definition.dataset.field = field;
      values.append(element('dt', fieldLabel(field)), definition);
    }
    section.append(values);
    return section;
  }

  function renderRow(row, lang) {
    const article = element('article', undefined, 'comparison-row');
    article.dataset.status = row.status;
    article.dataset.id = row.id;
    article.append(element('h4', t('comparison.status.' + row.status) + ' — ' + row.id));
    const values = element('div', undefined, 'comparison-values');
    values.append(renderSide(row.reference, 'reference', lang), renderSide(row.current, 'current', lang));
    article.append(values);
    if (row.changes.length) {
      const changes = element('ul', undefined, 'comparison-changes');
      for (const field of row.changes) {
        const change = element('li', fieldLabel(field) + ': ' + fieldValue(row.reference, field, lang)
          + ' → ' + fieldValue(row.current, field, lang));
        change.dataset.field = field;
        changes.append(change);
      }
      article.append(changes);
    }
    return article;
  }

  // Filtering changes only the displayed rows, not the full-list counts or totals.
  // Rendering does not register listeners or change item objects, storage, or focus.
  function render(result, { currentName = '', referenceName = '', onlyChanges = false, pageIndex = 0 } = {}) {
    const rows = onlyChanges ? result.rows.filter(row => row.status !== 'unchanged') : result.rows;
    const total = rows.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    pageIndex = Math.min(pageCount - 1, Math.max(0, Number.isFinite(pageIndex) ? Math.trunc(pageIndex) : 0));
    const offset = pageIndex * PAGE_SIZE;
    const end = Math.min(offset + PAGE_SIZE, total);
    const lang = getLang();
    document.getElementById('comparisonSummary').textContent = t('comparison.summary', result.counts);
    document.getElementById('comparisonNames').textContent = t('comparison.names', { current: currentName, reference: referenceName });
    renderStats(result);
    const fragment = document.createDocumentFragment();
    for (const row of rows.slice(offset, end)) fragment.append(renderRow(row, lang));
    if (!total) fragment.append(element('p', t('comparison.noRows')));
    document.getElementById('comparisonRows').replaceChildren(fragment);
    document.getElementById('comparisonPage').textContent = t('comparison.page', { start: total ? offset + 1 : 0, end, total });
    document.getElementById('comparisonPrev').disabled = pageIndex === 0;
    document.getElementById('comparisonNext').disabled = pageIndex >= pageCount - 1;
    return { pageIndex, pageCount, total };
  }

  root.LoadoutComparisonView = { render };
})(typeof globalThis === 'object' ? globalThis : this);
