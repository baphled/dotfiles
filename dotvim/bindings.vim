let mapleader = ","

" Don't use Ex mode, use Q for formatting
map Q gq

"make Y consistent with C and D
nnoremap Y y$

" toggle highlight trailing whitespace
nmap <silent> <leader>s :set nolist!<CR>

" Ctrl-N to disable search match highlight
nmap <silent> <C-N> :silent noh<CR>

" Ctrol-E to switch between 2 last buffers
nmap <C-E> :b#<CR>

" ,e to fast finding files. just type beginning of a name and hit TAB
nmap <leader>e :e **/

" Make shift-insert work like in Xterm
map <S-Insert> <MiddleMouse>
map! <S-Insert> <MiddleMouse>

" ,j to get the next location (compilation errors, grep etC)
nmap <leader>j :cn<CR>
" ,k to get the previous location (compilation errors, grep etC)
nmap <leader>k :cp<CR>

" Toggle spellchecker
nmap <leader>sp :set spell!<CR>

" ,; for toggling highlighted search
noremap <leader>; :set hlsearch! hlsearch?<CR>

" Calling bundle shouldn't be so much of a pain
nmap <leader>B :Bundle<CR>

"set completeopt=menuone,preview,longest
set completeopt=menuone,preview

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Custom bindings for increasing/decreasing the height and width of a buffer
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
nmap <esc>< :vertical res +10^M<CR>
nmap <esc>> :vertical res -10^M<CR>

" Toggle paste
set pastetoggle=<F12>

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Custom bindings for moving lines around alah TextMate
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

nmap <C-Up> [e
nmap <C-Down> ]e

vmap <C-Up> [egv
vmap <C-Down> ]egv

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Automatically set syntax
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
if did_filetype()   " filetype already set..
    finish      " ..don't do these checks
endif
if getline(1) =~ '^#!.*\<mine\>'
    setfiletype mine
elseif getline(1) =~? '\<drawing\>'
    setfiletype drawing
endif

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Running tests
""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" vim-makegreen binds itself to ,t unless something else is bound to its
" function.
map <leader>\dontstealmymapsmakegreen :w\|:call MakeGreen('spec')<cr>

function! RunTests(filename)
    " Write the file and run tests for the given filename
    :w
    :silent !echo;echo;echo;echo;echo;echo;echo;echo;echo;echo
    if match(a:filename, '\.feature$') != -1
        exec ":!bundle exec cucumber " . a:filename
    elseif match(a:filename, '_spec\.js\.coffee$') != -1
        exec ":!bundle exec jasmine-headless-webkit " . a:filename
    else
        if filereadable("script/test")
            exec ":!script/test " . a:filename
        else
            exec ":!bundle exec rspec " . a:filename
        end
    end
endfunction

function! SetTestFile()
    " Set the spec file that tests will be run for.
    let t:grb_test_file=@%
endfunction

function! RunTestFile(...)
    if a:0
        let command_suffix = a:1
    else
        let command_suffix = ""
    endif

    " Run the tests for the previously-marked file.
    let in_test_file = match(expand("%"), '\(.feature\|_spec.rb\|_spec.js.coffee\)$') != -1
    if in_test_file
        call SetTestFile()
    elseif !exists("t:grb_test_file")
        return
    end
    call RunTests(t:grb_test_file . command_suffix)
endfunction

function! RunNearestTest()
    let spec_line_number = line('.')
    call RunTestFile(":" . spec_line_number)
endfunction

map <leader>t :call RunTestFile()<cr>
map <leader>T :call RunNearestTest()<cr>
map <leader>a :call RunTests('')<cr>
nnoremap <leader>c :exec "!clear; bundle exec cucumber " . bufname("%") . ":" . line(".")<CR>
map <leader>C :w\|:!bundle exec cucumber --profile wip<cr>
