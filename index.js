!(async (window, $) => {
  const $app = $('#app')
  const $container = $app.find('#face-container')
  const face = await $.get('./lib/data.json')
  face.sort((a, b) => Number(a.QSid) - Number(b.QSid))
  face.forEach(({ QSid, QDes, isStatic }) => {
    const src = isStatic ? `static/s${QSid}.png` : `gif/s${QSid}.gif`
    const $img = $('<img>', { class: 'img', src }).on(
      'error',
      function() {
        $(this).replaceWith($('<div>', { class: 'img', text: '?' }))
      }
    )
    const $block = $('<a>', {
      href: src,
      target: '_blank',
      class: 'face',
    }).append(
      $img,
      $('<div>', { class: 'face-id', text: QSid }),
      $('<div>', { class: 'face-desc', text: QDes })
    )

    $container.append($block)
  })
})(window, jQuery)
