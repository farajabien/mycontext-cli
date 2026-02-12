const esbuild = require("esbuild");

const baseConfig = {
    bundle: true,
    entryPoints: ["./src/extension.ts"],
    external: ["vscode"],
    format: "cjs",
    platform: "node",
    outfile: "./dist/extension.js",
    logLevel: "info",
};

const watch = process.argv.includes("--watch");

async function main() {
    if (watch) {
        const ctx = await esbuild.context(baseConfig);
        await ctx.watch();
        console.log("Watching...");
    } else {
        await esbuild.build(baseConfig);
        console.log("Build complete.");
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
