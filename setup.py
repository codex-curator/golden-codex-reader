#!/usr/bin/env python3
from setuptools import setup

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="golden-codex-reader",
    version="3.0.0",
    description="Open-source reader for extracting Soulprint metadata from Golden Codex images",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Metavolve Labs, Inc.",
    author_email="dev@metavolvelabsinc.com",
    url="https://github.com/codex-curator/golden-codex-reader",
    py_modules=["golden_codex_reader"],
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "golden-codex-reader=golden_codex_reader:main",
        ],
    },
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Multimedia :: Graphics",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    keywords="golden-codex metadata soulprint xmp exiftool c2pa provenance",
    project_urls={
        "Homepage": "https://golden-codex.com",
        "Bug Tracker": "https://github.com/codex-curator/golden-codex-reader/issues",
        "Dataset": "https://huggingface.co/datasets/Metavolve-Labs/alexandria-aeternum-genesis",
    },
)
