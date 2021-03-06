const emoji = [
  ['👍', '❤️', '😂'],
  ['🤔', '😨'],
  ['😥', '😡'],
  ['🍀', '🏆', '🔥', '💩'],
];

let reactDialog = null;
let reactDialogData = {
  postID: null,
  username: null,
  onReact: () => {},
};

let postMenuData = null;
let postMenuElement = null;

const createPostMenu = () => {
  const menu = document.createElement('div');
  menu.classList.add('dialog', 'menu', 'post-menu');

  const list = document.createElement('div');
  list.classList.add('list');
  menu.appendChild(list);

  const addToCollection = document.createElement('div');
  addToCollection.classList.add('item');
  addToCollection.innerHTML =
    '<span class="mdi mdi-folder-plus"></span> Add to Collection';
  list.appendChild(addToCollection);

  addToCollection.addEventListener('click', event =>
    postMenuData.addToCollectionClick(event)
  );

  list.appendChild(document.createElement('hr'));

  const flag = document.createElement('div');
  flag.classList.add('item');
  flag.innerHTML = '<span class="mdi mdi-flag-variant"></span> Report';
  list.appendChild(flag);

  flag.addEventListener('click', () => {
    window.location.href = `/${postMenuData.user.username}/${
      postMenuData.postID
    }/flag`;
  });

  const removePost = document.createElement('div');
  removePost.classList.add('item', 'deleteButton');
  removePost.innerHTML =
    '<span class="mdi mdi-close-circle-outline"></span> Remove';
  list.appendChild(removePost);

  removePost.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();

    if (confirm('Are you sure you want to delete the post?')) {
      fetch(`/${postMenuData.user.username}/${postMenuData.postID}/delete`, {
        method: 'delete',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
        .then(data => data.json())
        .then(json => {
          if (json.status !== 'ok') {
            alert('Could not remove post, please contact support');
            return;
          }

          // If user is viewing single post and deletes it, redirects back to main page
          if (
            window.location.pathname ===
              `/${postMenuData.user.username}/${postMenuData.postID}` ||
            window.location.pathname ===
              `/${postMenuData.user.username}/${postMenuData.postID}/`
          ) {
            window.location.href = `/`;
          } else {
            document.getElementById(postMenuData.postID).remove();
          }
        });

      postMenuElement.style.display = 'none';
    }
  });

  document.addEventListener('click', () => {
    if (menu) menu.style.display = 'none';
  });

  document.body.appendChild(menu);

  postMenuElement = menu;
};

if (window.user) createPostMenu();

const registerPostMenuClick = (post, element) => {
  const fixedPosition = element => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top + window.scrollY, left: rect.right };
  };

  if (!window.user) return;

  element.addEventListener('click', event => {
    event.stopPropagation();

    const position = fixedPosition(element);
    postMenuElement.style.top = position.top + 32 + 2 + 'px';
    postMenuElement.style.left = position.left + 'px';
    postMenuElement.style.display = 'block';

    const deleteButton = postMenuElement.querySelector('.deleteButton');
    if (!window.user.isAdmin) {
      if (post.user.username !== window.user.username) {
        deleteButton.style.display = 'none';
      } else {
        deleteButton.style.display = 'block';
      }
    } else {
      deleteButton.style.display = 'block';
    }

    postMenuData = post;
  });
};

(() => {
  reactDialog = document.createElement('div');
  reactDialog.classList.add('dialog', 'add-react');
  reactDialog.innerHTML = emoji
    .map(
      x =>
        `<div>${x
          .map(y => `<span value="${y}">${twemoji.parse(y)}</span>`)
          .join('')}</div>`
    )
    .join('');

  reactDialog.querySelectorAll('span').forEach(element =>
    element.addEventListener('click', () => {
      fetch(`/${reactDialogData.username}/${reactDialogData.postID}/react`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emoji: element.getAttribute('value'),
        }),
      })
        .then(data => data.json())
        .then(json => {
          reactDialogData.onReact(element.innerHTML);
        });
    })
  );

  document.addEventListener('click', event => {
    reactDialog.style.display = 'none';
  });

  document.querySelector('content').appendChild(reactDialog);
})();

const createPost = (post, link = false) => {
  const fixedPosition = element => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top + window.scrollY, left: rect.left };
  };

  const modal = document.createElement('div');
  modal.classList.add('modal', 'post', 'full');
  modal.id = post.postID;

  let currentMedia = post.media[0];

  // Construct the basic post layout
  // prettier-ignore
  modal.innerHTML = `
    <div class="gallery">
      <div class="control right"><span class="mdi mdi-arrow-right"></span></div>
      <div class="control left"><span class="mdi mdi-arrow-left"></span></div>

      <div class="view"><span class="mdi mdi-fullscreen"></span>View full image</div>

      <div class="container">
        <div class="list">
          ${post.media.map(media => `
          <div class="media">
            ${media.type === 'image' ? `<div class="image" style="background-image: url(/file/${media.fileID}/l);"></div>` : ''}
            ${media.type === 'video' ? `<div class="video"><video controls>
              <source src="/file/${media.fileID}" type="${media.mimeType}">
            </video></div>` : ''}
          </div>
          `).join('')}
        </div>
      </div>
    </div>
    ${post.location ? `
    <div>
      <div class="location" ${post.location.fileID ? `style="background-image: url(/file/${post.location.fileID})"` : ''}>
        <div class="icon">
          <span class="mdi mdi-${post.location.icon}"></span>
        </div>
        <div class="info">
          <p>${post.location.name}</p>
          <small>${post.location.address}</small>
        </div>
      </div>
    </div>
    `: ''}
    <div class="user">
      <a href="/${post.user.username}">
        <div class="icon">
          <div class="image" ${post.user.image ? `style="background-image: url(/file/${post.user.image}/s)"`: ''}></div>
        </div>
      </a>
      <div class="info">
        <a href="/${post.user.username}">
          <p>${post.user.displayName}</p>
          <small>@${post.user.username}</small>
        </a>
      </div>
      <div class="action">
        <div class="button-small follow"></div>
      </div>
    </div>
    <hr />
  `;

  const info = document.createElement('div');
  info.classList.add('info');

  // Format and include the post text content
  const content = document.createElement('a');
  content.classList.add('text');
  content.textContent = post.text;

  if (link) {
    content.setAttribute('href', `/${post.user.username}/${post.postID}`);
  }

  let htmlContent = content.innerHTML.replace(
    /\B(\#[a-zA-Z]{1,16}\b)(?!;)/gm,
    x => `<a>${x}</a>`
  );
  htmlContent = twemoji.parse(htmlContent);
  content.innerHTML = htmlContent;

  // Format and include the post time
  const time = document.createElement('p');
  time.classList.add('time');
  time.innerText = moment(post.createdAt).fromNow();
  time.setAttribute('title', moment(post.createdAt).format('DD.MM.YYYY HH.mm'));

  info.appendChild(content);
  info.appendChild(time);

  const reactContainer = document.createElement('div');
  reactContainer.classList.add('react');
  info.appendChild(reactContainer);

  // We have to create a non relative positioned container because of the video rendering issue in chrome
  const infoContainer = document.createElement('div');
  infoContainer.appendChild(info);
  modal.appendChild(infoContainer);

  // Handle admin view reports
  if (post.flags && post.flags.length) {
    const flagContainer = document.createElement('div');
    flagContainer.classList.add('reports');

    for (const flag of post.flags) {
      const flagElement = document.createElement('p');
      flagElement.innerText = flag.text;
      flagContainer.appendChild(flagElement);

      const flagInfoElement = document.createElement('div');

      const user = document.createElement('a');
      user.setAttribute('href', `/${flag.user.username}`);
      user.classList.add('user');
      user.innerText = '@' + flag.user.username;
      flagInfoElement.appendChild(user);

      const time = document.createElement('span');
      time.classList.add('time');
      time.setAttribute(
        'title',
        moment(flag.createdAt).format('DD.MM.YYYY HH:mm')
      );
      time.innerText = moment(flag.createdAt).fromNow();
      flagInfoElement.appendChild(time);

      flagContainer.appendChild(flagInfoElement);
    }

    modal.appendChild(flagContainer);
  }

  // Handle the madia controls
  const right = modal.querySelector('.gallery > .right');
  const left = modal.querySelector('.gallery > .left');
  const list = modal.querySelector('.gallery > .container > .list');
  let position = 0;

  left.style.display = 'none';
  right.style.display = 'none';

  if (post.media.length > 1) {
    right.style.display = 'block';
  }

  const handleViewFullButton = () => {
    const view = modal.querySelector('.view');
    if (post.media.length && post.media[position].type === 'video') {
      view.style.display = 'none';
    } else {
      view.style.display = 'block';
    }
  };

  const moveGalleryPosition = direction => {
    position = Math.max(
      0,
      Math.min(post.media.length - 1, position + direction)
    );
    list.style.left = `${-position * 100}%`;

    left.style.display = position > 0 ? 'block' : 'none';
    right.style.display = position < post.media.length - 1 ? 'block' : 'none';

    currentMedia = post.media[position];

    handleViewFullButton();
  };

  handleViewFullButton();

  right.addEventListener('click', () => {
    moveGalleryPosition(1);
  });

  left.addEventListener('click', () => {
    moveGalleryPosition(-1);
  });

  modal.querySelector('.view').addEventListener('click', () => {
    window.location.href = `/file/${currentMedia.fileID}`;
  });

  let userReact = post.userReact;

  reactContainer.innerHTML = `<div class="list"></div>`;

  const reactButton = document.createElement('div');
  reactButton.classList.add('button-small', 'add');
  reactButton.innerHTML = '<span class="mdi mdi-plus"></span> React';

  reactButton.addEventListener('click', event => {
    event.stopPropagation();

    reactDialogData.postID = post.postID;
    reactDialogData.username = post.user.username;
    reactDialogData.onReact = value => {
      userReact = value;
      myReact.innerHTML = userReact;
      updateReactStatus();
    };

    const rect = fixedPosition(reactButton);
    reactDialog.style.top = rect.top - 64 + 8 + 'px';
    reactDialog.style.left = rect.left + reactButton.offsetWidth / 2 + 'px';
    reactDialog.style.display = 'flex';

    // Function to check if element is on the screen (bottom)
    const isInViewportBottom = elem => {
      var bounding = elem.getBoundingClientRect();
      return (
        bounding.bottom <=
          (window.innerHeight || document.documentElement.clientHeight) &&
        bounding.right <=
          (window.innerWidth || document.documentElement.clientWidth)
      );
    };
    // Function to check if element is off the screen (top)
    const isInViewportTop = elem => {
      var bounding = elem.getBoundingClientRect();
      return bounding.top >= 0;
    };

    // Media query for reacts and checks if the react box fits in the screen, if not, puts the box on top of the react button
    if (window.matchMedia('(max-width: 600px)').matches) {
      reactDialog.style.top = rect.top - 210 + 'px';
      if (!isInViewportBottom(reactDialog)) {
        reactDialog.style.top = rect.top - 365 + 'px';
      }
      if (!isInViewportTop(reactDialog)) {
        reactDialog.style.top = rect.top - 55 + 'px';
      }
    }
  });

  const myReact = document.createElement('div');
  myReact.classList.add('mine');
  myReact.innerHTML = twemoji.parse(userReact || '');

  myReact.addEventListener('click', () => {
    fetch(`/${post.user.username}/${post.postID}/react`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(data => data.json())
      .then(json => {
        userReact = null;
        updateReactStatus();
      });
  });

  reactContainer.appendChild(reactButton);
  reactContainer.appendChild(myReact);

  const updateReactStatus = () => {
    if (window.user) {
      if (!userReact) {
        reactContainer.querySelector('.add').style.display = 'block';
        reactContainer.querySelector('.mine').style.display = 'none';
      } else {
        reactContainer.querySelector('.add').style.display = 'none';
        reactContainer.querySelector('.mine').style.display = 'block';
      }
    } else {
      reactContainer.querySelector('.mine').style.display = 'none';
      reactContainer.querySelector('.add').style.display = 'none';
    }

    const reactAmount = (post.reacts || []).reduce((l, x) => l + x.amount, 0);
    if (reactAmount) {
      reactContainer.querySelector('.list').style.display = 'block';
      reactContainer.querySelector('.list').innerHTML = `
        <span class="amount"><span>${reactAmount}</span></span>
        ${(post.reacts || []).map(x => twemoji.parse(x.text)).join('')}
      `;
    } else {
      reactContainer.querySelector('.list').style.display = 'none';
    }
  };

  updateReactStatus();

  const followButton = modal.querySelector('.action .follow');
  let isFollowingUser = post.user.following;

  // Update the visuals of the follow button
  const updateFollowStatus = () => {
    if (isFollowingUser) {
      followButton.classList.add('unfollow');
      followButton.innerHTML =
        '<span class="mdi mdi-account-multiple-minus"></span> Unfollow';
    } else {
      followButton.classList.remove('unfollow');
      followButton.innerHTML =
        '<span class="mdi mdi-account-multiple-plus"></span> Follow';
    }
  };

  // Call the follow API and fire the "follow" event is successfull
  followButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();

    fetch(`/${post.user.username}/follow`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(data => data.json())
      .then(json => {
        if (json.status === 'ok') {
          const event = new CustomEvent('follow', {
            detail: {
              username: post.user.username,
              state: !isFollowingUser,
            },
          });
          document.dispatchEvent(event);
        }
      });
  });

  // Listen for follow event and update UI if necessary
  document.addEventListener('follow', event => {
    if (event.detail.username !== post.user.username) return;
    isFollowingUser = event.detail.state;
    updateFollowStatus();
  });

  // Remove the follow button if user is logged out or this post is posted by logged in user
  if (!window.user || post.user.username === window.user.username)
    followButton.remove();

  updateFollowStatus();

  // Create a dialog form for collections
  const dialog = document.createElement('dialog');
  const form = document.createElement('form');
  const choose = document.createElement('label');
  const select = document.createElement('select');
  const collectionMenu = document.createElement('menu');
  const confirmButton = document.createElement('button');
  const cancelButton = document.createElement('button');

  confirmButton.id = 'Confirm';
  confirmButton.innerHTML = 'Confirm';
  confirmButton.value = 'Confirm';
  cancelButton.innerHTML = 'Cancel';
  dialog.id = 'dialog';
  form.method = 'dialog';
  choose.innerHTML = 'Choose collection';

  dialog.appendChild(form);
  form.appendChild(choose);
  form.appendChild(collectionMenu);
  collectionMenu.appendChild(cancelButton);
  collectionMenu.appendChild(confirmButton);
  choose.appendChild(select);

  reactContainer.appendChild(dialog);

  let collectionsFound = false;

  // Create the three dot post menu
  if (window.user) {
    const postMenu = document.createElement('div');
    postMenu.classList.add('more', 'button-small');
    postMenu.innerHTML = '<span class="mdi mdi-dots-horizontal"></span>';
    reactContainer.appendChild(postMenu);

    registerPostMenuClick(
      {
        ...post,
        addToCollectionClick: event => {
          event.preventDefault();

          fetch(`/collection`)
            .then(data => data.json())
            .then(json => {
              if (json.status === 'ok') {
                if (!collectionsFound) {
                  for (let i = 0; i < json.collections.length; i++) {
                    select.innerHTML += `<option>${
                      json.collections[i].name
                    }</option>`;
                  }
                  collectionsFound = true;
                }
                dialog.showModal();
                document.dispatchEvent(event);
              }
            });
        },
      },
      postMenu
    );
  }

  confirmButton.addEventListener('click', event => {
    const postData = {
      postID: post.postID,
      collectionName: select.value,
    };

    fetch(`/${window.user.username}/collection/${select.value}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })
      .then(data => data.json())
      .then(json => {
        if (json.status === 'ok') {
          document.dispatchEvent(event);
        }
      });
  });

  return modal;
};
