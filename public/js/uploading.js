(function() {
	$(document).ready(init);

	function init() {
		$('#overlay').hide().removeClass('hidden');
		$('h1 span a').click(scroll);

		$('#uploadForm').submit(upload);
		
		$('.inputfile').on('change', update_name);
		
	}

	function upload() {

		$("#uploadStatus").empty().text("uploading...");
		$(this).ajaxSubmit({
			dataType:'json',
			error: function(xhr) {
				$("#uploadStatus").empty()
					.text('Error: ' + xhr.status + xhr.statusText)
					.removeClass('success')
					.addClass('error');
			},
			success: function(res) {
				$("#uploadStatus").empty()
					.text(res.err ? res.err : res.msg)
					.removeClass('success error')
					.addClass(res.err ? 'error' : 'success');
				if(!res.err) {
					clear_form();
					//add file to list
					console.log(res.added);
					var a = $('<a></a>')
						.attr('href',"/!/"+res.added.file)
						.text(res.added.title);
					var li = $('<li><p></p></li>')
						.find('p')
						.text(res.added.authors+", ")
						.append(a)
						.append(' ('+res.added.ext+')');
					$('ul#texts').append(li);
				}
			}
		});
		//stops event propogation
		return false;
	}

	function clear_form() {
		$('#uploadForm input[type=text]').val('');
		$('#uploadForm input[type=file]').val('');
		$('.inputfile + label span').text('Choose file...');
		$("#upload_svg").show();

	}

	function update_name(e) {
		var name = $(e.target).val().split('\\').pop();
		if(name!=='') {
			var smallname = (name.length < 35) ? name : name.substr(0,32)+'...';
			$("#upload_svg").hide();
			$(this).next().find('span').text(smallname).attr('title',name);

		} else {
			$(this).next().find('span').text('Choose file...').attr('title','');
			$("#upload_svg").show();
		}
	}
	
	function scroll(e) {
		var target = $($(this).attr('href'));
		if (target !== undefined && target.length !== 0 && target !== "" && !(target === "." || target === "#")) {
			e.preventDefault();
			$('html,body').animate({scrollTop: target.offset().top},'fast');
			return false;
		}
	}

})();