import AppKit

// Renders a transparent-background "d" glyph for use as a macOS template image.
func render(size: Int, fontSize: CGFloat, to path: String) {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil,
                               pixelsWide: size, pixelsHigh: size,
                               bitsPerSample: 8, samplesPerPixel: 4,
                               hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: size, height: size).fill()

    let font = NSFont.systemFont(ofSize: fontSize, weight: .bold)
    let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.black]
    let text = NSAttributedString(string: "d", attributes: attrs)
    let bounds = text.boundingRect(with: NSSize(width: 1000, height: 1000),
                                   options: [.usesLineFragmentOrigin])
    let origin = NSPoint(x: (CGFloat(size) - bounds.width) / 2,
                         y: (CGFloat(size) - bounds.height) / 2)
    text.draw(at: origin)

    NSGraphicsContext.restoreGraphicsState()
    let png = rep.representation(using: .png, properties: [:])!
    try! png.write(to: URL(fileURLWithPath: path))
    print("wrote \(path) (\(size)x\(size), \(png.count) bytes)")
}

let dir = CommandLine.arguments[1]
render(size: 22, fontSize: 17, to: "\(dir)/tray.png")
render(size: 44, fontSize: 34, to: "\(dir)/tray@2x.png")
