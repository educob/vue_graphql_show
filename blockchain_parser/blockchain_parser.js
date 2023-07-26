https://learnmeabitcoin.com/glossary/blkdat
const fs = require('fs')
const path = require('path')

// Constant separating blocks in the .blk files
const MAINNET_CONSTANT = new Uint8Array([249, 190, 180, 217])
const TESTNET_CONSTANT = new Uint8Array([11, 17, 9, 7])

const blocks_path = '/'

function get_block(blockfile, offset) {
  const filePath = path.join(blocks_path, blockfile)
    // Extracts a single block from the blockfile at the given offset
    let fd = fs.openSync(extent.fn, 'rb')
    with open(blockfile, "rb") as f:
        f.seek(offset - 4)  // Size is present 4 bytes before the db offset
        size, = struct.unpack("<I", f.read(4))
        return f.read(size)
}

class Blockchain(object):
    """Represent the blockchain contained in the series of .blk files maintained by bitcoind. """

    def __init__(self, path):
        self.path = path
        self.blockIndexes = None
        self.indexPath = None

    def __getBlockIndexes(self, index): 
        """There is no method of leveldb to close the db (and release the lock).
        This creates problem during concurrent operations.
        This function also provides caching of indexes.  """
        if self.indexPath != index:
            db = plyvel.DB(index, compression=None)
            self.blockIndexes = [DBBlockIndex(format_hash(k[1:]), v)
                                 for k, v in db.iterator() if k[0] == ord('b')]
            db.close()
            self.blockIndexes.sort(key=lambda x: x.height)
            self.indexPath = index
        return self.blockIndexes

    def _index_confirmed(self, chain_indexes, num_confirmations=6):
        """Check if the first block index in "chain_indexes" has at least
        "num_confirmation" (6) blocks built on top of it.
        If it doesn't it is not confirmed and is an orphan.
        """

        # chains holds a 2D list of sequential block hash chains
        # as soon as there an element of length num_confirmations,
        # we can make a decision about whether or not the block in question
        # is confirmed by checking if it's hash is in that list
        chains = []
        # this is the block in question
        first_block = None

        # loop through all future blocks
        for i, index in enumerate(chain_indexes):
            # if this block doesn't have data don't confirm it
            if index.file == -1 or index.data_pos == -1:
                return False

            # parse the block
            blkFile = os.path.join(self.path, "blk%05d.dat" % index.file)
            block = Block(get_block(blkFile, index.data_pos))

            if i == 0:
                first_block = block

            chains.append([block.hash])

            for chain in chains:
                # if this block can be appended to an existing block in one
                # of the chains, do it
                if chain[-1] == block.header.previous_block_hash:
                    chain.append(block.hash)

                # if we've found a chain length == num_dependencies (usually 6)
                # we are ready to make a decesion on whether or not the block
                # belongs to a fork or the main chain
                if len(chain) == num_confirmations:
                    if first_block.hash in chain:
                        return True
                    else:
                        return False

    def get_ordered_blocks(self, index, start=0, end=None, cache=None):
        """ Yields the blocks contained in the .blk files as per
        the heigt extract from the leveldb index present at path
        index maintained by bitcoind.  """

        blockIndexes = None

        if cache and os.path.exists(cache):
            # load the block index cache from a previous index
            with open(cache, 'rb') as f:
                blockIndexes = pickle.load(f)

        if blockIndexes is None:
            # build the block index
            blockIndexes = self.__getBlockIndexes(index)
            if cache and not os.path.exists(cache):
                # cache the block index for re-use next time
                with open(cache, 'wb') as f:
                    pickle.dump(blockIndexes, f)

        # remove small forks that may have occured while the node was live.
        # Occassionally a node will receive two different solutions to a block
        # at the same time. The Leveldb index saves both, not pruning the
        # block that leads to a shorter chain once the fork is settled without
        # "-reindex"ing the bitcoind block data. This leads to at least two
        # blocks with the same height in the database.
        # We throw out blocks that don't have at least 6 other blocks on top of
        # it (6 confirmations).
        orphans = []  # hold blocks that are orphans with < 6 blocks on top
        last_height = -1
        for i, blockIdx in enumerate(blockIndexes):
            if last_height > -1:
                # if this block is the same height as the last block an orphan
                # occurred, now we have to figure out which of the two to keep
                if blockIdx.height == last_height:

                    # loop through future blocks until we find a chain 6 blocks
                    # long that includes this block. If we can't find one
                    # remove this block as it is invalid
                    if self._index_confirmed(blockIndexes[i:]):

                        # if this block is confirmed, the unconfirmed block is
                        # the previous one. Remove it.
                        orphans.append(blockIndexes[i - 1].hash)
                    else:

                        # if this block isn't confirmed, remove it.
                        orphans.append(blockIndexes[i].hash)

            last_height = blockIdx.height

        # filter out the orphan blocks, so we are left only with block indexes
        # that have been confirmed
        # (or are new enough that they haven't yet been confirmed)
        blockIndexes = list(
            filter(lambda block: block.hash not in orphans, blockIndexes))

        if end is None:
            end = len(blockIndexes)

        for blkIdx in blockIndexes[start:end]:
          if blkIdx.file == -1 or blkIdx.data_pos == -1:
              break
          blkFile = os.path.join(self.path, "blk%05d.dat" % blkIdx.file)
          yield get_block(blkFile, blkIdx.data_pos), blkIdx.height

function hash256( buf ) {
    const hash1 = crypto.createHash('sha256').update(buf).digest()
    const hash2 = crypto.createHash('sha256').update(hash1).digest()
    return hash2.reverse().toString('hex')
}

function readSlice (n) {
  let buffer = Buffer.alloc(n)
  var readCount = fs.readSync(inF, buffer, null, n, offset)
  if(readCount < n) {
      console.log("read count < ", n)
      return null
  }
  offset += n
  return buffer
}

function utcNow () {
  return Math.floor(Date.now() / 1000)
}

function sleep(millis) {
return new Promise(resolve => setTimeout(resolve, millis))
} 