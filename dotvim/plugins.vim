" showmarks
let g:showmarks_enable = 0 " disabled by default by populardemand ;)
hi! link ShowMarksHLl LineNr
hi! link ShowMarksHLu LineNr
hi! link ShowMarksHLo LineNr
hi! link ShowMarksHLm LineNr

" syntastic
let g:syntastic_enable_signs=1
let g:syntastic_auto_loc_list=1

" delimitMate
let g:delimitMate_expand_space = 1
let g:delimitMate_expand_cr = 1

" nerdtree
" Ctrl-P to Display the file browser tree
nmap <C-P> :NERDTreeToggle<CR>
" ,p to show current file in the tree
nmap <leader>p :NERDTreeFind<CR>

" nerdcommenter
" ,/ to invert comment on the current line/selection
nmap <leader>/ :call NERDComment(0, "invert")<cr>
vmap <leader>/ :call NERDComment(0, "invert")<cr>

" sessionman
nmap <leader>S :SessionList<CR>
nmap <leader>SS :SessionSave<CR>
nmap <leader>SA :SessionSaveAs<CR>

" minibufexpl
let g:miniBufExplVSplit = 25
let g:miniBufExplorerMoreThanOne = 100
let g:miniBufExplUseSingleClick = 1
" ,b to display current buffers list
nmap <Leader>b :MiniBufExplorer<cr>

" yankring
let g:yankring_replace_n_pkey = '<leader>['
let g:yankring_replace_n_nkey = '<leader>]'
" ,y to show the yankring
nmap <leader>y :YRShow<cr>

" rails
" completing Rails hangs a lot
"let g:rubycomplete_rails = 1

" command-t
nmap <unique> <silent> <Leader><Leader> :CommandT<CR>
nmap <unique> <silent> <Leader><Leader><Leader> :CommandTFlush<CR>:CommandT<CR>
let g:CommandTMatchWindowAtTop=1

" Fugitive
" ,e for Ggrep
nmap <leader>g :Ggrep 

" Ack
" ,a for Ack
nmap <leader>k :Ack 

" vim-indentobject
" add Markdown to the list of indentation based languages
let g:indentobject_meaningful_indentation = ["haml", "sass", "python", "yaml", "markdown"]

" Custom bindings for moving lines alah TextMate
nmap <C-Up> [e
nmap <C-Down> ]e

vmap <C-Up> [egv
vmap <C-Down> ]egv

" Vimerl custom bindings

" Automatic folding
:let erlang_folding = 0

" Hide and show errors
nmap <leader>ee :ErlangEnableShowErrors<CR>
nmap <leader>ede :ErlangDisableShowErrors<CR>

" Skeleton header
:let erlang_skel_header = {"author": "Yomi Collection", "owner" : "Yomi Colledge"}

" Skeleton bindings
nmap <leader>ea :ErlangApplication<CR>
nmap <leader>es :ErlangSupervisor<CR>
nmap <leader>eg :ErlangGenServer<CR>
nmap <leader>ef :ErlangGenFsm<CR>
nmap <leader>ege :ErlangGenEvent<CR>
