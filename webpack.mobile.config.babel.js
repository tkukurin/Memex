import initConfig from './build'

export default (env = {}) => {
    const conf = initConfig({
        entry: { content_script: 'src/mobile-content-script/index.ts' },
        context: __dirname,
        // mode: 'production',
        notifsEnabled: true,
        shouldPackage: false,
        injectStyles: true,
        isCI: true,
    })

    return conf
}
