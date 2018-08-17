# Fjord

[![CircleCI](https://circleci.com/gh/compactd/fjord/tree/master.svg?style=svg)](https://circleci.com/gh/compactd/fjord/tree/master)  [![codecov](https://codecov.io/gh/compactd/fjord/branch/master/graph/badge.svg)](https://codecov.io/gh/compactd/fjord)

Fjord purpose is to download torrents through a remote server that acts as a buffer. As soon as the server receives a piece, it can immediately deliver it to its own network of clients.  The server comes with a built-in storage manager, that removes low priority finished torrents or inactive ones, when room is needed in order to download a new torrent so that this can be used as low storage seedbox
