(function() {
	
	$(document).ready(init);

	function init() {
		$('#updateForm').submit(update);
		$('.delete-button').click(delete_item);
		$('.edit-button').click(show_edit);
		$('#updateClose').click(close_overlay);
	}

	function close_overlay() {
		$('#overlay').fadeOut();
		return false;
	}

	function delete_item() {
		var that = this;
		var id = $(this).closest('li').addClass('deleting').data('id');

		$("#confirm").show();
		$("#update").hide();
		$('#updateStatus').empty();
		$('#overlay').fadeIn();

		$('#confirmClose').click(function() {
			$('#confirmDelete').off('click');
			$('#confirmClose').off('click');
			$(that).closest('li').removeClass('deleting');
			close_overlay();
		});

		$('#confirmDelete').click( function() {
			$('#confirmDelete').off('click');
			$('#confirmClose').off('click');
			$.ajax('/delete',{
				method:'POST',
				dataType:'json',
				data:{id:id},
				error: function(xhr) {
					$("#confirmStatus").text('Failed to delete:' + xhr.status);
					$(that).closest('li').removeClass('deleting');
				},
				success: function(res){
					if(res.success) {
						$(that).closest('li').remove();
						close_overlay();
					}
					else {
						$("#confirmStatus").text('Failed to delete:' + res.err);
						$(that).closest('li').removeClass('deleting');
					}
				}
			});
		});
	}

	function show_edit() {
		$("#confirm").hide();
		$("#update").show();
		console.log('edit');
		var item = $(this).closest('li');
		var id = item.data('id');
		var title = item.data('title');
		var authors = item.data('authors');
		$('#updateForm input#updateID').val(id);
		$('#updateForm input[name=title]').val(title);
		$('#updateForm input[name=authors]').val(authors);
		$('#updateStatus').empty();
		$('#overlay').fadeIn();
	}

	function update() {
		var id = $('#updateForm input#updateID').val();
		console.log(id);
		$(this).ajaxSubmit({
			dataType:'json',
			error: function(xhr) {
				$("#updateStatus").empty()
					.text('Error: ' + xhr.status)
					.removeClass()
					.addClass('error');
			},
			success: function(res) {
				$("#updateStatus").empty()
					.text(res.err ? res.err : res.msg)
					.removeClass()
					.addClass(res.err ? 'error' : 'success');
				if(!res.err) {
					close_overlay();
					var title = $('#updateForm input[name=title]').val();
					var authors = $('#updateForm input[name=authors]').val();
					var li = $('li[data-id='+id+']');
					li.data('title', title);
					li.data('authors', authors);
					li.find('span.authors').text(authors);
					li.find('a.title').text(title);
				}
			}
		});
		//stops event propogation
		return false;
	}

})();