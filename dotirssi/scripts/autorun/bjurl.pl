# This is a code fork of burl.pl by Hugo Haas.
# burl.pl by Hugo Haas was a code fork of Jean-Yves Lefort's url.pl, version 0.54.

use Irssi 20020121.2020 ();
use URI::Escape;
use HTML::Entities;
$VERSION = "1.2.4";
%IRSSI = (
	  authors     => 'Devin weaver',
	  contact     => 'suki\@tritarget.org',
	  name        => 'bjurl',
	  description => 'A better jQuery URL grabber for Irssi',
	  license     => 'BSD',
	  changed     => '2012/01/04',
	  modules     => 'URI::Escape HTML::Entities',
	  commands    => 'bjurl'
);

# description:
#
#	burl.pl grabs URLs in messages and allows you to open them on the fly,
#	or to write them in a HTML file and open that file.
#
# /set's:
#
#       url_max_urls
#
#               The maximun number of URL to keep in memory
#               default: 20
#
#	url_grab_level
#
#		message levels to take in consideration
#		example: PUBLICS ACTIONS
#
#	url_redundant
#
#		whether to assign same URL a new number or not
#		example: ON
#
#	url_verbose_grab
#
#		whether to grab verbosely or not
#		example: OFF
#
#	url_hilight
#
#		whether to hilight the URLs in the text or not
#		example: OFF
#
#	url_index_color
#
#               NOT USED ANYMORE
#		hilight index color (mirc color string)
#
#	url_color
#
#               NOT USED ANYMORE
#		hilight URL color (mirc color string)
#
#	browse_command
#
#		a command used to open URLs
#		%u will be replaced by the URL
#		example: galeon %u &
#
#	url_html_location
#
#		where to write the URL list
#		example: ~/.irssi-urls.html
#
#	url_use_webapp
#
#	        create a dynamic JavaScript based web app or
#	        just a static html file
#	        example: OFF
#
# commands
#
#	/URL [-clear|-clean|-refresh|<number>]
#
#		-clear will clear the URL list.
#		-clean removes any writen files.
#		-refresh cleans and rewrites HTML files.
#
#		<number> will open the specified URL.
#
#		If no arguments are specified, force the files to update with
#		latest URLs and open the site.

use strict;
use POSIX qw(strftime);

#use constant MSGLEVEL_NO_URL => 0x0400000;

my @items;

# -verbatim- import expand
sub expand {
  my ($string, %format) = @_;
  my ($len, $attn, $repl) = (length $string, 0);
  
  $format{'%'} = '%';

  for (my $i = 0; $i < $len; $i++) {
    my $char = substr $string, $i, 1;
    if ($attn) {
      $attn = undef;
      if (exists($format{$char})) {
	$repl .= $format{$char};
      } else {
	$repl .= '%' . $char;
      }
    } elsif ($char eq '%') {
      $attn = 1;
    } else {
      $repl .= $char;
    }
  }
  
  return $repl;
}
# -verbatim- end

# Used for testing only.
sub get_items {
    return @items;
}

sub push_items {
    if (scalar(@items) >= Irssi::settings_get_int('url_max_urls')) {
        shift @items;
    }
    push @items, @_;
}

sub find_path {
  my ($path) = glob Irssi::settings_get_str('url_html_location');
  $path =~ s+/$++; # Remove trailing slashes if any
  $path = "${path}/index.html" if (!Irssi::settings_get_bool('url_use_webapp') && -d $path);
  return $path;
}

sub split_and_insert {
    my ($target, $text, $stripped) = @_;

    if ($stripped =~ /[a-zA-Z0-9+-.]+:\/\/[^ \t\<\>\"]+/o) {
	my $num = -1;
	if (! Irssi::settings_get_bool('url_redundant')) {
	    my $n = 1;
	    foreach (@items) {
		if ($_->{url} eq $&) {
		    $num = $n;
		    last;
		}
		$n++;
	    }
	}

	if ($num == -1) {
	    &push_items({
		time => time,
		target => $target,
		pre_url => "$`",
		url => "$&",
		post_url => "$'"
            });
	    $num = @items;
	    Irssi::print('Added item #' . $num . ' to URL list')
		if Irssi::settings_get_bool('url_verbose_grab');
	}

	my $url_pos = index $text, $&;
	my $left = substr($text, $url_pos + length $&);
	$stripped = substr($stripped, index($stripped, $&) + length $&);

#	if (Irssi::settings_get_bool('url_hilight')) {
#	    $text =  substr($text, 0, $url_pos) .
#		Irssi::settings_get_str('url_index_color') . $num . ':'.
#		Irssi::settings_get_str('url_color') . $& . '';
#	}
	if (Irssi::settings_get_bool('url_hilight')) {
	    $text =  substr($text, 0, $url_pos) .
		'' . $num . ':<' . $& . '>';
	}
	return($text, $left, $stripped);
    } {
	return ($text, '', '');
    }
}

sub parse_text {
    my ($l) = scalar @items;
    my (@ret) = &split_and_insert(@_);
    &update_site_files if ($l != scalar @items);
    return @ret;
}

my $inprogress = 0;

sub print_text {
  my ($textdest, $t, $stripped) = @_;

#  return if ($textdest->{level} & MSGLEVEL_NO_URL);
  return if ($inprogress);

  if (Irssi::level2bits(Irssi::settings_get_str('url_grab_level'))
      & $textdest->{level}) {

      my $s = $stripped;
      my $text;

      my $l;
      $l = $t;
      while($l ne '') {
	  my $r;
	  ($r, $l, $s) = &parse_text($textdest->{target}, $l, $s);
	  $text .= $r;
      }

      if (($text ne $t) && Irssi::settings_get_bool('url_hilight')) {
#	  $textdest->{level} |= MSGLEVEL_NO_URL;
	  $inprogress = 1;
	  Irssi::signal_emit('print text', $textdest,
			     $text, $stripped);
	  $inprogress = 0;
	  Irssi::signal_stop();
      }
  }
}

sub update_site_files {
  my ($path) = &find_path;
  if (Irssi::settings_get_bool('url_use_webapp')) {
      mkdir $path if (! -e $path);
      if (! -d $path) {
          Irssi::print("Unable to write URL grabber webapp: $path is not a directory", MSGLEVEL_CLIENTERROR);
          return 0;
      }
      my ($css) = "${path}/style.css";
      my ($js) = "${path}/script.js";
      my ($html) = "${path}/index.html";
      my ($json) = "${path}/urls.json";
      if (! -e $css) {
          if (my $error = write_css_file($css)) {
              Irssi::print("Unable to write $css: $error", MSGLEVEL_CLIENTERROR);
              return 0;
          }
      }
      if (! -e $js) {
          if (my $error = write_js_file($js)) {
              Irssi::print("Unable to write $js: $error", MSGLEVEL_CLIENTERROR);
              return 0;
          }
      }
      if (! -e $html) {
          if (my $error = write_html_file($html)) {
              Irssi::print("Unable to write $html: $error", MSGLEVEL_CLIENTERROR);
              return 0;
          }
      }
      # Always write new json file
      if (my $error = write_json_file($json)) {
          Irssi::print("Unable to write $json: $error", MSGLEVEL_CLIENTERROR);
          return 0;
      }
      $path = $html;
  } else {
      if (my $error = write_static_file($path)) {
          Irssi::print("Unable to write $path: $error", MSGLEVEL_CLIENTERROR);
          return 0;
      }
  }
  return $path;
}

sub write_css_file {
    my $file = shift;
    open(FILE, ">$file") or return $!;
    print FILE <<'EOF' or return $!;
body {
    text-align: center;
    margin: 5px;
    padding: 5px;
    background: #fff;
    color: #000;
}
#container { margin: auto; }
.title { font-family: "MolotRegular", Arial, sans-serif; }
#error {
    background-color: red;
    margin: 0px 0px 20px 0px;
    padding: 5px;
}
#update-time {
    font-style: italic;
    font-weight: normal;
}
#url-list {
    text-align: left;
    padding: 5px 0px;
    border: 3px solid #000;
    background-color: #4DC9FF;
}
.url-item {
    border: 0px;
    margin: 0px;
    padding: 5px 10px;
}
#nodata { text-align: center; }
.odd { background-color: #4DC9FF; }
.even { background-color: #00A4EB; }
.time {
    font-size: 0.8em;
    font-style: italic;
}
.nick { font-weight: bold; }
.message a { font-weight: bold; }
a { color: #000; }
#footer {
    margin-top: 20px;
    font-size: 0.8em;
}
@media only screen and (min-width: 320px) {
    #container { width: 300px; }
}
@media only screen and (min-width: 480px) {
    #container { width: 460px; }
}
@media only screen and (min-width: 600px) {
    #container { width: 580px; }
    .title {
        text-shadow:5px 5px 5px #333333;
        -moz-text-shadow:5px 5px 5px #333333;
        -webkit-text-shadow:5px 5px 5px #333333;
    }
    #error, #url-list {
        border-radius: 10px;
        -moz-border-radius: 10px;
        -webkit-border-radius: 10px;
        box-shadow:5px 5px 5px #333333;
        -moz-box-shadow:5px 5px 5px #333333;
        -webkit-box-shadow:5px 5px 5px #333333;
    }
}
EOF
    close(FILE) or return $!;
    return undef;
}

sub write_js_file {
    my $file = shift;
    open(FILE, ">$file") or return $!;
    print FILE <<'EOF' or return $!;
var Site = { refresh: 30000, data: [ ], size: 0, running: false, timer: null, error_msg: "", enableNotifications: false };
Site.weblink = "http://sukima.github.com/bjurl/weblink.gif";
Site.show_error = function() {
    if (Site.error_msg != "") {
        $("#error").html("<span class='error_msg'>"+Site.error_msg+"</span>").show();
    } else {
        $("#error").hide();
    }
    Site.error_msg = "";
};
Site.strip = function(text) {
    return $("<div/>").html(text).text();
};
Site.notify = function(item) {
    if (window.webkitNotifications && Site.enableNotifications && window.webkitNotifications.checkPermission() == 0) {
        var popup = window.webkitNotifications.createNotification(Site.weblink, item.nick+" says:", Site.strip(item.message));
        popup.show();

        setTimeout(function() { popup.cancel(); }, 10000);
    }
}
Site.populate = function()  {
    var evenodd, item;
    var populated = false;
    if (!Site.running || Site.data.length < Site.size) {
        Site.clear();
    }
    Site.update = new Date();
    for (var i=Site.size; i < Site.data.length; i++)  {
        populated = true;
        evenodd = (i%2==0) ? "even" : "odd";
        item = $("<div class=\"url-item "+ evenodd +"\">"+
            "<div class=\"time\">"+ Site.data[i].time +"</div>"+
            "<span class=\"nick\">"+ Site.data[i].nick +":</span> "+
            "<span class=\"message\">"+ Site.data[i].message +"</span></div>")
            .hide()
            .css('opacity',0.0)
            .prependTo('#url-list')
            .slideDown('slow')
            .animate({opacity: 1.0});
        if (Site.running) { Site.notify(Site.data[i]); }
    }
    if (populated) { $("#nodata").hide(); }
    Site.running = true;
    Site.size = Site.data.length;
    $("#update-time").text(new Date().toLocaleString());
    Site.show_error();
};
Site.continueCycle = function() {
    Site.timer = setTimeout(Site.fetch, Site.refresh);
};
Site.success = function(d) {
    Site.data = d;
    Site.populate();
    Site.continueCycle();
};
Site.error = function(jqXHR, textStatus, errorThrown) {
    Site.error_msg = "There was an error loading update. Try again by refreshing the entire page. "+ errorThrown;
    Site.populate();
    Site.continueCycle();
};
Site.clear = function() {
    $(".url-item").remove();
    $("#nodata").css('opacity',0.0)
        .slideDown('slow')
        .animate({opacity: 1.0});
    return false;
};
Site.init = function() {
    Site.fetch(); /* Start the load JSON cycle */
    // initalize notifications switch on first run.
    if (window.webkitNotifications && $("#notifyconfig").length == 0) {
        var controls = $("#controls");
        controls.html(controls.html() + " [<a id=\"notifyconfig\" href=\"#\">enable notifications</a>]");
        $("#notifyconfig").click(function(e) {
            e.preventDefault();
            Site.enableNotifications = !Site.enableNotifications;
            if (Site.enableNotifications) {
                $("#notifyconfig").text("disable notifications");
                if (window.webkitNotifications.checkPermission() > 0) {
                    window.webkitNotifications.requestPermission();
                }
            } else {
                $("#notifyconfig").text("enable notifyconfig");
            }
        });
    }
    $("#refresh").click(function(e) { e.preventDefault(); Site.fetch(); });
    $("#clear").click(function(e) { e.preventDefault(); Site.clear(); });
};
Site.fetch = function()  {
    if (Site.timer !== null) {
        clearTimeout(Site.timer);
        Site.timer = null;
    }
    $.ajax({
        url: "urls.json",
        dataType: 'json',
        cache: false,
        success: Site.success,
        error: Site.error
    });
    return false;
};
EOF
    close(FILE) or return $!;
    return undef;
}

sub write_html_file {
    my $file = shift;
    open(FILE, ">$file") or return $!;
    print FILE <<'EOF' or return $!;
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
  <head>
    <title>IRC URL list</title>
    <link rel="stylesheet" href="style.css" />
    <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js" type="text/javascript"></script>
    <script src="script.js" type="text/javascript"></script>
  </head>
  <body>
      <div id="container">
        <h1 class="title">IRC URL list</h1>
        <p class="last-update">Last Update: <span id="update-time"></span></p>
        <p id="controls">[<a href="#" id="refresh">refresh</a>] [<a href="#" id="clear">clear</a>]</p>
        <div id="error" style="display:none;"></div>
        <div id="url-list">
            <div id="nodata">No entries so far</div>
        </div>
      </div>
      <div id="footer"><a href="http://github.com/sukima/bjurl" target="_blank">bjurl</a> by Devin Weaver</div>
  </body>
  <script type="text/javascript">
      $(function() { Site.init(); });
  </script>
</html>
EOF
    close(FILE) or return $!;
    return undef;
}

sub write_json_file {
    my $file = shift;
    open(FILE, ">$file.tmp") or return $!;
    print FILE "[" or return $!;
    foreach (@items) {
        my $timestamp = strftime('%Y-%m-%d %H:%M%Z', localtime $_->{time});
        my $pre = HTML::Entities::encode($_->{pre_url});
        my $post = HTML::Entities::encode($_->{post_url});
        my $target = $_->{target};
        $pre =~ s/"/\"/g;
        $post =~ s/"/\"/g;
        $target =~ s/"/\"/g;
        print FILE
        "{\"time\":\"$timestamp\",\"nick\":\"$target\",\"message\":\"$pre<a href='"
        . HTML::Entities::encode(uri_escape($_->{url}, "^-A-Za-z0-9./:")) . "' target='_blank'>"
        . HTML::Entities::encode($_->{url}) . "</a>$post\"}"
            or return $!;
        print FILE "," unless ($_ == $items[-1]);
    }
    print FILE "]\n" or return $!;
    close(FILE) or return $!;
    rename("$file.tmp", $file);
    return undef;
}

sub write_static_file {
  my $file = shift;

  open(FILE, ">$file.tmp") or return $!;

  print FILE <<'EOF' or return $!;
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
  <head>
    <title>IRC URL list</title>
  </head>
  <body>
    <center>
      <table border="1" cellpadding="5">
	<caption>IRC URL list</caption>
	<tr><th>Time</th><th>Target</th><th>Message</th></tr>
EOF

  foreach (@items) {
    my $timestamp = strftime('%Y-%m-%d %H:%M%Z', localtime $_->{time});
    print FILE
	"	<tr><td>$timestamp</td><td>$_->{target}</td><td>$_->{pre_url}<a href='"
	. HTML::Entities::encode(uri_escape($_->{url}, "^-A-Za-z0-9./:")) . "'>"
	. HTML::Entities::encode($_->{url}) . "</a>$_->{post_url}</td></tr>\n"
	or return $!;
  }
  
  print FILE <<'EOF' or return $!;
      </table>
    </center>
    <hr>
    <center><small>Generated by burl.pl</small></center>
  </body>
</html>
EOF

  close(FILE) or return $!;
  rename("$file.tmp", $file);

  return undef;
}

sub clean_site_files {
  my ($path) = &find_path;
  if (Irssi::settings_get_bool('url_use_webapp')) {
    unlink  "${path}/style.css";
    unlink "${path}/script.js";
    unlink "${path}/index.html";
    unlink "${path}/urls.json";
  } else {
    unlink $path;
  }
}

sub url {
  my ($args, $server, $item) = @_;
  my $command = Irssi::settings_get_str('browse_command');

  if ($args ne '') {
    if (lc $args eq '-clear') {
      @items = ();
      &update_site_files;
      Irssi::print('URL list cleared');
    } elsif (lc $args eq '-clean') {
      &clean_site_files;
      Irssi::print('All HTML files removed');
    } elsif (lc $args eq '-refresh') {
      &clean_site_files;
      &update_site_files;
      Irssi::print('All HTML files rebuilt');
    } elsif ($args =~ /^[0-9]+$/) {
      if ($args > 0 && $items[$args - 1]) {
	system(expand($command, 'u', $items[$args - 1]->{url}));
      } else {
	Irssi::print("URL #$args not found");
      }
    } else {
      Irssi::print('Usage: /URL [-clear|-clean|-refresh|<number>]', MSGLEVEL_CLIENTERROR);
    }
  } else {
    if (@items) {
      my $file;
      if ($file = &update_site_files) {
	system(expand($command, 'u', $file)) if ($command && $command ne "");
      }
    } else {
      Irssi::print('URL list is empty');
    }
  }
}

Irssi::settings_add_int('misc', 'url_max_urls', 20);
Irssi::settings_add_str('misc', 'url_grab_level',
			'PUBLIC TOPICS ACTIONS MSGS DCCMSGS');
Irssi::settings_add_bool('lookandfeel', 'url_verbose_grab', undef);
Irssi::settings_add_bool('lookandfeel', 'url_hilight', 1);
#Irssi::settings_add_str('lookandfeel', 'url_index_color', '08');
#Irssi::settings_add_str('lookandfeel', 'url_color', '12');
Irssi::settings_add_bool('misc', 'url_redundant', 0);
Irssi::settings_add_str('misc', 'browse_command',
			'galeon-wrapper %u >/dev/null &');
Irssi::settings_add_str('misc', 'url_html_location', '~/.irc_url_list.html');
Irssi::settings_add_bool('misc', 'url_use_webapp', 0);

Irssi::signal_add('print text', \&print_text);

Irssi::command_bind('url', \&url);
