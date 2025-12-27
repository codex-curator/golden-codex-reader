from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="golden-codex-reader",
    version="2.0.0",
    author="Metavolve Labs, Inc.",
    author_email="curator@golden-codex.com",
    description="Read, verify, and match Golden Codex metadata from digital artworks",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/codex-curator/golden-codex-reader",
    project_urls={
        "Bug Tracker": "https://github.com/codex-curator/golden-codex-reader/issues",
        "Documentation": "https://goldencodex.art/docs",
        "Source": "https://github.com/codex-curator/golden-codex-reader",
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Multimedia :: Graphics",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Operating System :: OS Independent",
    ],
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[],
    extras_require={
        "exiftool": ["pyexiftool>=0.5.0"],
        "hash": [
            "imagehash>=4.3.0",
            "Pillow>=9.0.0",
            "requests>=2.28.0",
        ],
        "full": [
            "pyexiftool>=0.5.0",
            "imagehash>=4.3.0",
            "Pillow>=9.0.0",
            "requests>=2.28.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "golden-codex-reader=golden_codex_reader:main",
        ],
    },
    keywords=[
        "golden-codex",
        "metadata",
        "artwork",
        "provenance",
        "xmp",
        "digital-art",
        "soulwhisper",
        "perceptual-hash",
        "image-matching",
    ],
)
