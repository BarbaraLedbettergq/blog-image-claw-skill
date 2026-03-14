---
name: blog-image-claw-skill
description: Auto-generate hero and inline images for blog posts from titles and section text. One command produces a full image set ready to drop into your article.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - NETA_TOKEN
      bins:
        - node
    primaryEnv: NETA_TOKEN
    emoji: "📝"
    homepage: https://github.com/BarbaraLedbettergq/blog-image-claw-skill
---

# Blog Image Claw Skill

Auto-generate hero and inline images for blog posts.

## Commands

```bash
# Single hero/OG image
node blogimg.js header "<title>" [--style editorial|tech|lifestyle|minimal|photo] [--tone light|dark]

# Single inline image for a section
node blogimg.js inline "<section text>" [--style ...] [--tone light|dark]

# Full post: header + all inline images at once
node blogimg.js post "<title>" "<section1>" "<section2>" ... [--style ...] [--tone light|dark] [--count n]
```

## Styles

`editorial` · `tech` · `lifestyle` · `minimal` · `photo`

## Setup

```
NETA_TOKEN=your_token_here
```
in `~/.openclaw/workspace/.env`
