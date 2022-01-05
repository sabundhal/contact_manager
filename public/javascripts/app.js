function hide(element) {
  element.classList.add('hidden');
}

function unhide(element) {
  element.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const addContactButton = document.querySelector('button[name="add"]');
  const contactsDiv = document.querySelector('#contacts');
  const addContactDiv = document.querySelector('#add_contact');
  const addContactCancel = addContactDiv.querySelector('button[name="cancel"]');
  const addContactForm = addContactDiv.querySelector('form');
  const mainHeader = document.querySelector('main header');
  const searchBar = document.querySelector('input[name="search"]');
  const editContactDiv = document.querySelector('#edit_contact');
  const createTagForm = document.querySelector('#create_tag');
  const tagsDiv = document.querySelector('#tags');

  const contactTemplate = Handlebars.compile($('#contact_template').html());
  const editContactTemplate = Handlebars.compile($('#edit_contact_template').html());

  function renderContacts() {
    $.ajax({
      url: 'http://localhost:3000/api/contacts',
      type: "GET",
      dataType: "json",
    }).done(function(json) {
      for (let i = 0; i < json.length; i += 1) {
        let contact = contactTemplate(json[i]);
        $('#contacts').append(contact);
      }
      renderTagsFromContacts();
    }).fail(function(jqXHR, textStatus) {
      console.log(textStatus);
    })
  }

  function clearContacts() {
    [...contactsDiv.children].forEach(child => {
      child.remove();
    })
  }

  function refreshContacts() {
    clearContacts();
    renderContacts();
  }

  function getExistingTagNames() {
    return [...tagsDiv.querySelectorAll('button')].map(tag => {
      return tag.textContent;
    });
  }

  function createTag(tagText) {
    let existingTags = getExistingTagNames();
    if (!existingTags.includes(tagText) && tagText !== "") {
      let tag = document.createElement('button');
      tag.textContent = tagText;
      tagsDiv.appendChild(tag);

      let tagOption = document.createElement('option');
      tagOption.value = tagText;
      tagOption.textContent = tagText;
      addContactDiv.querySelector('select').appendChild(tagOption);
    } else {
      return `The tag "${tagText}" already exists`;
    }
  }

  function renderTagsFromContacts() {
    let tagsAssignedToContacts = [...document.querySelectorAll('.contact_tags')];
    tagsAssignedToContacts.forEach(tagP => {
      let tags = tagP.textContent.split(',')
      tags.forEach(tagText => createTag(tagText));
    });
  }

  function deleteContact(contactId) {
    $.ajax({
      url: `http://localhost:3000/api/contacts/${contactId}`,
      type: 'DELETE',
    }).done(function() {
      alert('Delete successful');
    }).fail(function(jqXHR, textStatus) {
      alert('Delete not successful');
    })
  }

  function formValuesToJSON(formElement) {
    let data = new FormData(formElement);
    let obj = {};
    data.forEach((value, key) => {
      obj[key] = value;
    });

    let tags = [];
    for (let option of formElement.querySelector('select').options) {
      if (option.value === "none" && option.selected) continue;
      if (option.selected) {
        tags.push(option.value);
      }
    }
    obj["tags"] = tags.join(',');
    return JSON.stringify(obj);
  }

  function createEditListeners() {
    let editForm = document.querySelector('#edit_contact form');
    editForm.addEventListener('click', (e) => {
      let target = e.target;
      if (target.tagName === 'BUTTON' && target.name === 'cancel') {
        eraseEditContactForm();
      }
    });

    editForm.addEventListener('submit', submitEdits);
  }

  function submitEdits(e) {
    let form = e.currentTarget;
    let id = form.querySelector('input[name="id"]').value;
    let json = formValuesToJSON(form);
    $.ajax({
      url: `http://localhost:3000/api/contacts/${id}`,
      type: 'PUT',
      data: json,
      dataType: "json",
      contentType: "application/json",
    })
      .done(function(json) {
        refreshContacts();
        eraseEditContactForm();
      }).fail(function(jqXHR, textStatus) {
        alert('edit not successful')
      })
  }

  function eraseEditContactForm() {
    unhide(mainHeader);
    unhide(contactsDiv);
    hide(editContactDiv);
    editContactDiv.innerHTML = "";
  }

  function displayEditContactForm(contactId) {
    $.ajax({
      url: `http://localhost:3000/api/contacts/${contactId}`,
      type: 'GET',
      dataType: 'json',
    })
      .done(function(json) {
        $('#edit_contact').append(editContactTemplate(json));
        let $tagSelect = $('#add_contact select').clone();
        $('#edit_contact select').replaceWith($tagSelect);
        let tags = json.tags.split(',');
        tags.forEach(tag => {
          let matchingOption = document.querySelector(`#edit_contact option[value="${tag}"]`);
          matchingOption.selected = true;
        });
        hide(mainHeader);
        hide(contactsDiv);
        unhide(editContactDiv);
        createEditListeners();
      }).fail(function(jqXHR, textStatus) {
        alert('Contact does not exist');
      })
  }

  function displaySearchedContacts(search) {
    let contacts = [...contactsDiv.children];
    contacts.forEach((contact) => {
      let contactName = contact.querySelector('h2').textContent;
      if (contactName.includes(search)) {
        unhide(contact);
      } else {
        hide(contact);
      }
    });
  }

  function filterContactByTag(tag) {
    if (tag === "Reset Filter") {
      refreshContacts();
    } else {
      let contacts = [...contactsDiv.children];
      contacts.forEach((contact) => {
        let contactTags = contact.querySelector('.contact_tags').textContent.split(',');
        if (contactTags.includes(tag)) {
          unhide(contact);
        } else {
          hide(contact);
        }
      });
    }
  }

  renderContacts();

  // clicking "Add Contact" button
  addContactButton.addEventListener('click', (e) => {
    hide(mainHeader);
    hide(contactsDiv)
    unhide(addContactDiv);
  });

  // clicking cancel on addContact form
  addContactCancel.addEventListener('click', (e) => {
    unhide(mainHeader);
    unhide(contactsDiv);
    hide(addContactDiv);
  });

  // submitting a new contact
  addContactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let json = formValuesToJSON(addContactForm);
    $.ajax({
      url: 'http://localhost:3000/api/contacts/',
      method: "POST",
      data: json,
      dataType: "json",
      contentType: "application/json",
    })
      .done((json) => {
        refreshContacts();
        hide(addContactDiv);
        unhide(contactsDiv);
        unhide(mainHeader);
      }).fail((jqXHR, textStatus) => {
        console.log(textStatus);
      })
  });

  // deleting a contact
  contactsDiv.addEventListener('click', (e) => {
    let target = e.target;
    if (target.name === "delete") {
      let contactId = target.parentNode.dataset.id;
      let willDelete = window.confirm("Are you sure you want to delete this contact?");
      if (willDelete) {
        deleteContact(contactId);
        refreshContacts();
      }
    }
  });

  // clicking the edit button
  contactsDiv.addEventListener('click', (e) => {
    let target = e.target;
    if (target.name === "edit") {
      let contactId = target.parentNode.dataset.id;
      displayEditContactForm(contactId);
    }
  });

  // using the search bar
  searchBar.addEventListener('keyup', (e) => {
    let currentSearch = e.currentTarget.value;
    displaySearchedContacts(currentSearch);
  });

  // creating a new tag
  createTagForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let tagText = createTagForm.querySelector('input').value;
    let errorMessage = createTag(tagText);
    if (errorMessage) alert(errorMessage);

    createTagForm.reset();
  });

  // filtering contacts by tag
  tagsDiv.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      let tag = e.target.textContent;
      filterContactByTag(tag);
      searchBar.value === "";
    }
  });
});
