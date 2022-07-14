// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "./RoyaltyStorage.sol";

contract RoyaltyRegistry is RoyaltyStorage {
    /// @dev emitted when royalties set for token.
    event RoyaltySetForCollection(address indexed _token, uint96 _oldRoyaltyRate, uint96 _royaltyRate);

    event ReceiverUpdated(address oldReceiver, address newReceiver);

    event DefaultRoyaltyRatePercentageUpdated(uint96 oldRate, uint96 newRate);

    /**
     * @notice Initialization for upgradeable contract.
     *
     * @param _receiver receiver address.
     * @param _defaultRateRoyaltyPercentage default royalty percentage.
     *
     */
    function initialize(address _receiver, uint96 _defaultRateRoyaltyPercentage) external initializer {
        receiver = _receiver;
        defaultRoyaltyRatePercentage = _defaultRateRoyaltyPercentage;
        __Ownable_init_unchained();
    }

    /**
     * @dev setter for receiver address.
     *
     * @param _newReceiver new Receiver address
     *
     */
    function changeReceiver(address _newReceiver) external onlyOwner {
        require(_newReceiver != address(0), "Invalid address");
        address oldReceiver = receiver;
        receiver = _newReceiver;

        emit ReceiverUpdated(oldReceiver, receiver);
    }

    /**
     * @dev setter for defaultRoyaltyRatePercentage
     * @notice the deafult royalty rate can be 0.
     *
     * @param _newDefaultRate new default rate for royalty.
     *
     */
    function changeDefaultRoyaltyRatePercentage(uint96 _newDefaultRate) external onlyOwner {
        require(_newDefaultRate <= MAX_RATE_ROYALTY, "Invalid Rate");
        uint96 oldDefaultRoyaltyRatePercentage = defaultRoyaltyRatePercentage;
        defaultRoyaltyRatePercentage = _newDefaultRate;

        emit DefaultRoyaltyRatePercentageUpdated(oldDefaultRoyaltyRatePercentage, defaultRoyaltyRatePercentage);
    }

    /**
     * @dev set royalty rate for specific collection. Support multiple set. The length of array between tokens & rates must exactly the same.
     * @notice the rate will be applied to all of token ids inside the collection.
     *
     * @param _tokens array of token address.
     * @param _royaltyRates array of royalty rates.
     */
    function setRoyaltyRateForCollections(address[] calldata _tokens, uint96[] calldata _royaltyRates)
        external
        onlyOwner
    {
        require(_tokens.length == _royaltyRates.length, "Mismatch arguments length");

        for (uint256 i = 0; i < _tokens.length; i++) {
            _setRoyaltyForCollection(_tokens[i], _royaltyRates[i]);
        }
    }

    /**
     * @dev internal setter royalty rate for collection.
     *
     * @param _token token / collection address.
     * @param _royaltyRate royalty rate for that particular collection.
     */
    function _setRoyaltyForCollection(address _token, uint96 _royaltyRate) private {
        require(_token != address(0), "Invalid token");
        require(_royaltyRate <= MAX_RATE_ROYALTY, "Invalid Rate");

        uint96 _oldRoyaltyRate = royaltyRateForCollection[_token];

        royaltyRateForCollection[_token] = _royaltyRate;

        emit RoyaltySetForCollection(_token, _oldRoyaltyRate, _royaltyRate);
    }

    /**
     * @dev royalty info for specific token / collection.
     * @dev It will return custom rate for the token, otherwise will return the default one.
     *
     * @param _token address of token / collection.
     *
     * @return _receiver receiver address.
     * @return _royaltyRatePercentage royalty rate percentage.
     */
    function getRoyaltyInfo(address _token) external view returns (address _receiver, uint96 _royaltyRatePercentage) {
        return (
            receiver,
            royaltyRateForCollection[_token] > 0 ? royaltyRateForCollection[_token] : defaultRoyaltyRatePercentage
        );
    }
}
