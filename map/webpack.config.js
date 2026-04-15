const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const sveltePreprocess = require('svelte-preprocess');
const SRC_FOLDER = path.resolve(__dirname, 'src/');
const DIST_FOLDER = path.resolve(__dirname, '../app/assets/map');
const ASSETS_FOLDER = path.resolve(__dirname, 'public/');

const ENTRY = path.resolve(SRC_FOLDER, 'main.ts');
module.exports = (env = {}, params = {}) => {
    Object.keys(env).forEach((k) => {
        if (env[k] === 'false' || env[k] === '0') {
            env[k] = false;
        } else if (env[k] === 'true' || env[k] === '1') {
            env[k] = true;
        }
    });
    const {
        production, // --env.production
        noconsole = true // --env.noconsole
    } = env;
    const mode = production !== undefined ? (!!production ? 'production' : 'development') : process.env.NODE_ENV || 'development';
    const platform = env && ((env.android && 'android') || (env.ios && 'ios'));
    const prod = mode === 'production';
    return {
        mode,
        entry: ENTRY,
        stats: 'none',
        resolve: {
            conditionNames: ['svelte', 'import', 'require', 'node', 'default'],
            alias: {
                // svelte: path.resolve(__dirname, '../node_modules/svelte')
            },
            extensions: ['.mjs', '.js', '.ts', '.svelte'],
            mainFields: ['svelte', 'browser', 'module', 'main']
            // plugins: [
            //     new PathsPlugin({
            //         extensions: ['.mjs', '.js', '.ts', '.svelte']
            //     })
            // ]
        },
        output: {
            path: DIST_FOLDER,
            // publicPath: DIST_FOLDER,
            filename: '[name].js',
            clean: true
        },
        module: {
            rules: [
                // {
                //     test: /node_modules\/svelte\/.*\.js$/,
                //     loader: 'babel-loader',
                //     options: {
                //         presets: [
                //             [
                //                 '@babel/preset-env',
                //                 {
                //                     // useBuiltIns: 'usage',
                //                 }
                //             ]
                //         ],
                //         plugins: ['@babel/plugin-transform-optional-chaining']
                //     }
                // },
                {
                    test: /\.ts$/,
                    // loader: 'ts-loader',
                    // options: {
                    //     transpileOnly: true,
                    //     allowTsInNodeModules: true,
                    //     configFile: resolve(__dirname, 'tsconfig.peakfinder.json'),
                    //     compilerOptions: {
                    //         sourceMap: false,
                    //         declaration: false
                    //     }
                    // }
                    loader: 'swc-loader',
                    options: {
                        jsc: {
                            target: 'es2019',
                            parser: {
                                syntax: 'typescript'
                            }
                        }
                    }
                },
                {
                    test: /\.js$/,
                    loader: 'swc-loader',
                    options: {
                        jsc: {
                            target: 'es2019'
                        }
                        // implementation: esbuild
                        // sourceMaps: false,
                        // plugins: ['@babel/plugin-transform-runtime'],
                        // presets: [
                        //     [
                        //         '@babel/env',
                        //         {
                        //             modules: false,
                        //             targets: {
                        //                 chrome: '70'
                        //             }
                        //         }
                        //     ]
                        // ]
                    }
                },
                {
                    test: /\.svelte$/,
                    loader: 'svelte-loader',
                    options: {
                        compilerOptions: {
                            // NOTE Svelte's dev mode MUST be enabled for HMR to work
                            dev: !prod // Default: false
                        },
                        preprocess: sveltePreprocess(),
                        // NOTE emitCss: true is currently not supported with HMR
                        // Enable it for production to output separate css file
                        emitCss: prod, // Default: false
                        // Enable HMR only for dev mode
                        hotReload: !prod, // Default: false
                        onwarn(warning, onwarn) {
                            return warning.code === 'css-unused-selector' || onwarn(warning);
                        },
                        // Extra HMR options, the defaults are completely fine
                        // You can safely omit hotOptions altogether
                        hotOptions: {
                            // Prevent preserving local component state
                            preserveLocalState: false,

                            // If this string appears anywhere in your component's code, then local
                            // state won't be preserved, even when noPreserveState is false
                            noPreserveStateKey: '@!hmr',

                            // Prevent doing a full reload on next HMR update after fatal error
                            noReload: false,

                            // Try to recover after runtime errors in component init
                            optimistic: false,

                            // --- Advanced ---

                            // Prevent adding an HMR accept handler to components with
                            // accessors option to true, or to components with named exports
                            // (from <script context="module">). This have the effect of
                            // recreating the consumer of those components, instead of the
                            // component themselves, on HMR updates. This might be needed to
                            // reflect changes to accessors / named exports in the parents,
                            // depending on how you use them.
                            acceptAccessors: true,
                            acceptNamedExports: true
                        }
                        // hotOptions: {
                        //     noPreserveState: true,
                        //     noReload: false,
                        //     optimistic: false
                        // }
                    }
                },
                {
                    test: /\.svg$/,
                    type: 'asset/inline'
                },
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                url: true
                            }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: [
                                        [
                                            'cssnano',
                                            {
                                                preset: 'advanced'
                                            }
                                        ],
                                        ['postcss-combine-duplicated-selectors', { removeDuplicatedProperties: true }]
                                    ]
                                }
                            }
                        }
                    ]
                },
                {
                    //Required to prevent errors from Svelte on Webpack 5+
                    test: /node_modules\/svelte\/.*\.mjs$/,
                    resolve: {
                        fullySpecified: false
                    }
                }
            ]
        },
        optimization: {
            usedExports: true,
            moduleIds: 'deterministic',
            runtimeChunk: 'single',
            splitChunks: {
                chunks: 'initial'
            },
            minimize: prod,
            minimizer: [
                new TerserPlugin({
                    parallel: true,
                    terserOptions: {
                        ecma: 2019,
                        module: false,
                        toplevel: false,
                        keep_classnames: false,
                        keep_fnames: false,
                        output: {
                            comments: false
                        },
                        mangle: true,
                        compress: {
                            sequences: platform !== 'android',
                            passes: 2,
                            drop_console: prod && noconsole
                        }
                    }
                }),
                new CssMinimizerPlugin({
                    parallel: true
                })
            ]
        },
        plugins: [
            new CopyPlugin({ patterns: [{ from: ASSETS_FOLDER, globOptions: { dot: false, ignore: [`**/*.html`] } }] }),
            new MiniCssExtractPlugin(),
            new HtmlWebpackPlugin({
                template: path.resolve(ASSETS_FOLDER, 'index.html'),
                title: 'Svelte App'
            })
        ],
        devtool: false
    };
};
