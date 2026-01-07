# Quartz v4

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.
Quartz v4 features a from-the-ground rewrite focusing on end-user extensibility and ease-of-use.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>


# Testing:

Compile with tikz support.
```
npx quartz build --serve
```

Compile without tikz support.
```
SKIP_TIKZ=1 npx quartz build --serve
```

Compile without custom OG Images.
```
SKIP_OG_IMAGE=1 npx quartz build --serve
```

Test OG Images.
```
npx tsx quartz/scripts/og-debug.tsx notes/<TOP LEVEL FOLDER>/title
```

# Pulling Content
```
git submodule update --init --recursive --remote --force
```
