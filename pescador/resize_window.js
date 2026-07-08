async function resize_window(browser, page, width, height) {
  await page.setViewportSize({ height, width })
  // Window frame - probably OS and WM dependent.
  //height += 85
  height += 225
  if (!page.__fescarWindowCdp) {
    page.__fescarWindowCdp = await browser.newCDPSession(page)
  }
  const cdp = page.__fescarWindowCdp
  const {windowId} = await cdp.send(
    'Browser.getWindowForTarget'
  )
  const {bounds} = await cdp.send(
    'Browser.getWindowBounds',
    {windowId}
  )
  const resize = async () => {
    await cdp.send('Browser.setWindowBounds', {
      bounds: {width: width, height: height},
      windowId
    })
  }
  if(bounds.windowState === 'normal') {
    await resize()
  } else {
    await cdp.send('Browser.setWindowBounds', {
      bounds: {windowState: 'minimized'},
      windowId
    })
    await resize()
  }
}

export default resize_window


