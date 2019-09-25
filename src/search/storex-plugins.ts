import {
    DexieUtilsPlugin,
    SearchLookbacksPlugin,
    SuggestPlugin,
    BackupPlugin,
} from 'src/search/plugins'
import { AnnotationsListPlugin } from 'src/search/background/annots-list'
import { SocialSearchPlugin } from 'src/search/background/social-search'
import { PageUrlMapperPlugin } from 'src/search/background/page-url-mapper'
import normalizeUrl from 'src/util/encode-url-for-id'

export const plugins = [
    new SocialSearchPlugin(),
    new BackupPlugin(),
    new AnnotationsListPlugin(),
    new PageUrlMapperPlugin(),
    new SuggestPlugin(),
    new DexieUtilsPlugin({ normalizeUrl }),
    new SearchLookbacksPlugin(),
]
