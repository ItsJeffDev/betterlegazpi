document.addEventListener('DOMContentLoaded', () => {
  const officialsContainer = document.getElementById('officials-container');
  if (!officialsContainer) return;

  fetch('../data/officials.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data) => {
      renderOfficials(data);
    })
    .catch((error) => {
      console.error('Error fetching officials data:', error);
      officialsContainer.innerHTML =
        '<p class="text-center text-danger">Failed to load officials data.</p>';
    });

  // Everything below is rendered with innerHTML, so values from the JSON are
  // escaped first (same approach as assets/js/news.js).
  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // "0927-414-3768" -> "tel:09274143768". Returns '' for anything that is not
  // a dialable number (e.g. "Unlisted") so the caller can show it as plain text.
  function telHref(number) {
    var digits = String(number || '').replace(/[^\d+]/g, '');
    return digits.replace(/\D/g, '').length >= 7 ? 'tel:' + digits : '';
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+$/.test(String(value || ''));
  }

  function contactRow(icon, inner, isUnlisted) {
    return (
      '<p class="mb-1' +
      (isUnlisted ? ' is-unlisted' : '') +
      '"><i class="bi ' +
      icon +
      '" aria-hidden="true"></i> ' +
      inner +
      '</p>'
    );
  }

  // Phones come from the structured `phones` array; the flat `phone` string is
  // only a fallback for records that do not have one.
  function phoneRows(person) {
    var phones =
      Array.isArray(person.phones) && person.phones.length
        ? person.phones
        : person.phone
          ? [{ number: person.phone }]
          : [];
    return phones
      .map(function (ph) {
        var icon = ph.network === 'Landline' ? 'bi-telephone' : 'bi-phone';
        var href = telHref(ph.number);
        if (!href)
          return contactRow(icon, '<span>' + esc(ph.number || 'Unlisted') + '</span>', true);
        var label = esc(ph.number) + (ph.network ? ' (' + esc(ph.network) + ')' : '');
        return contactRow(icon, '<a href="' + esc(href) + '">' + label + '</a>', false);
      })
      .join('');
  }

  // Mayor and Vice Mayor share one card; styles live in assets/css/style.css
  // (.exec-card) so they follow the light/dark theme tokens.
  function executiveCard(person, fallbackTitle) {
    var emailRow = isEmail(person.email)
      ? contactRow(
          'bi-envelope',
          '<a href="mailto:' + esc(person.email) + '">' + esc(person.email) + '</a>',
          false
        )
      : contactRow('bi-envelope', '<span>Unlisted</span>', true);

    return (
      '<div class="card text-center h-100 exec-card"><div class="card-body">' +
      '<div class="exec-avatar" aria-hidden="true"><i class="bi bi-person-badge-fill"></i></div>' +
      '<h4 class="card-title mb-1 exec-name">' +
      esc(person.name) +
      '</h4>' +
      '<span class="exec-badge">' +
      esc(person.title || fallbackTitle) +
      '</span>' +
      '<div class="official-contacts exec-contacts mt-3">' +
      emailRow +
      phoneRows(person) +
      '</div></div></div>'
    );
  }

  function renderOfficials(data) {
    let html = '';

    // Mayor & Vice Mayor
    html += '<div class="grid grid-2 mb-5">';
    if (data.mayor) html += executiveCard(data.mayor, 'City Mayor');
    if (data.vice_mayor) html += executiveCard(data.vice_mayor, 'City Vice Mayor');
    html += '</div>';

    // City Councilors (12 members: 10 Regular + 2 Ex-Officio with icon bulleted committees)
    if (data.councilors && data.councilors.length > 0) {
      html +=
        '<h3 class="text-center mt-5 mb-4" data-i18n="gov-sp-members">Sangguniang Panlungsod Members</h3>';
      html += '<div class="grid grid-3" style="gap: var(--spacing-md);">';

      data.councilors.forEach((councilor) => {
        const isLiga = councilor.badge_type === 'liga';
        const isSk = councilor.badge_type === 'sk';
        const isExOfficio = councilor.is_ex_officio || isLiga || isSk;

        const cardExtraClass = isLiga ? 'councilor-card--liga' : isSk ? 'councilor-card--sk' : '';
        const badgeExtraClass = isLiga
          ? 'councilor-badge--liga'
          : isSk
            ? 'councilor-badge--sk'
            : '';
        const exOfficioTag = isExOfficio
          ? '<span class="councilor-ex-officio-badge">EX-OFFICIO MEMBER</span>'
          : '';

        let commListHtml = '';
        if (councilor.committees && councilor.committees.length > 0) {
          commListHtml = '<ul class="councilor-committees-list">';
          councilor.committees.forEach((comm) => {
            commListHtml += `<li class="councilor-committee-item"><i class="bi ${esc(comm.icon || 'bi-check-circle')}" aria-hidden="true"></i> <span>${esc(comm.name)}</span></li>`;
          });
          commListHtml += '</ul>';
        } else {
          commListHtml = `<p class="councilor-committees">${esc(councilor.designation || 'Sangguniang Panlungsod Member')}</p>`;
        }

        html += `
          <div class="councilor-card ${cardExtraClass}">
            <h4 class="councilor-name">${esc(councilor.name)}</h4>
            <span class="councilor-badge ${badgeExtraClass}">${esc(councilor.title || 'SP Member')}</span>
            ${commListHtml}
            ${exOfficioTag}
          </div>
        `;
      });

      html += '</div>';
    }

    // Source credit line (styled by .officials-source-credit)
    html += `
      <div class="officials-source-credit text-center">
        <i class="bi bi-info-circle" aria-hidden="true"></i> Sources: <a href="https://legazpi.gov.ph/executive/" target="_blank" rel="noopener noreferrer">City Government of Legazpi - Executive</a> &bull; <a href="https://legazpi.gov.ph/directory/" target="_blank" rel="noopener noreferrer">City Government of Legazpi - Directory</a> &bull; <a href="https://legazpi.gov.ph/about-us/legislative/" target="_blank" rel="noopener noreferrer">City Government of Legazpi - Legislative</a>
      </div>
    `;

    officialsContainer.innerHTML = html;
  }
});
