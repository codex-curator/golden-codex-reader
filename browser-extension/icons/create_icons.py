#!/usr/bin/env python3
"""Create placeholder icons for Golden Codex Reader extension."""

from PIL import Image, ImageDraw

# Create simple placeholder icons with golden border
sizes = [16, 32, 48, 128]
bg_color = (30, 58, 138)  # Dark blue
border_color = (255, 215, 0)  # Gold

for size in sizes:
    img = Image.new('RGB', (size, size), color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # Add golden border
    border = max(1, size // 16)
    draw.rectangle([0, 0, size-1, size-1], outline=border_color, width=border)
    
    # Add "GC" text for larger sizes
    if size >= 32:
        text = "GC"
        # Simple centered text using default font
        bbox = draw.textbbox((0, 0), text)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - 2
        draw.text((x, y), text, fill=border_color)
    
    filename = f'icon{size}.png'
    img.save(filename)
    print(f'✓ Created {filename}')

print('\n✅ All icons created successfully!')
