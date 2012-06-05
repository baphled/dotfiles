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
" ,p to show current file in the tree
nmap <leader>p :NERDTreeToggle<CR>
nmap <leader>f :NERDTreeFind<CR>

" nerdcommenter
" ,/ to invert comment on the current line/selection
nmap <leader>/ :call NERDComment(0, "invert")<cr>
vmap <leader>/ :call NERDComment(0, "invert")<cr>

" yankring
let g:yankring_replace_n_pkey = '<leader>['
let g:yankring_replace_n_nkey = '<leader>]'

" ,y to show the yankring
nmap <leader>y :YRShow<cr>

" rails
" completing Rails hangs a lot
"let g:rubycomplete_rails = 1

" CtrlP
let g:ctrlp_working_path_mode = 2                               "Set to a directory that contains .git
nmap <unique> <silent> <Leader><Leader> :CtrlP<CR>
nnoremap <unique> <silent> <Leader><Leader><Leader> :CtrlPClearAllCaches<CR>:CtrlP<CR>

" Fugitive
" ,e for Ggrep
nmap <leader>grep :Ggrep 

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Custom bindings for Fugitive
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
nmap <leader>gcb :Git checkout -b
nmap <leader>gr :Git rebase -i
nmap <leader>gcf :Git checkout -- %<CR>
nmap <leader>gst :Gstatus<CR>
nmap <leader>gp :Git push<CR>
nmap <leader>gl :Glog --<CR>

" Bindings to custom git commands
nmap <leader>gra :Git ra<CR>
nmap <leader>gdc :Git dc<CR>
nmap <leader>ggn :Git gn<CR>

" Ack
" ,a for Ack
nmap <leader>ack :Ack 

" vim-indentobject
" add Markdown to the list of indentation based languages
let g:indentobject_meaningful_indentation = ["haml", "sass", "python", "yaml", "markdown"]

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Vimerl custom bindings
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" Automatic folding
:let erlang_folding = 0

" Hide and show errors
nmap <leader>ee :ErlangEnableShowErrors<CR>
nmap <leader>ede :ErlangDisableShowErrors<CR>

" Skeleton header
:let erlang_skel_header = {"author": "Yomi Colledge", "owner" : "Yomi Colledge"}

" Skeleton bindings
nmap <leader>ea :ErlangApplication<CR>
nmap <leader>es :ErlangSupervisor<CR>
nmap <leader>eg :ErlangGenServer<CR>
nmap <leader>ef :ErlangGenFsm<CR>
nmap <leader>ege :ErlangGenEvent<CR>