import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import host from '../host.js';

function Event() {
    const [event, setEvent] = useState(null);
    const [comments, setComments] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [showInput, setShowInput] = useState(false);
    const [users, setUsers] = useState({});
    const [participants, setParticipants] = useState([]);
    
    const { eventName } = useParams();
    const decodedEventName = decodeURIComponent(eventName);

    const api = host.apiUrl;

    let navigate = useNavigate();

    useEffect(() => {
        fetchEvent();
    }, []); // Fetch event when component mounts

    useEffect(() => {
        if (event) {
            fetchComments();
            fetchParticipants();
        }
    }, [event]); // Fetch comments when event changes

    const fetchEvent = async () => {
        try {
            const response = await axios.get(`${api}/Events/EventName/${decodedEventName}`);
            setEvent(response.data);
        } catch (error) {
            console.log('Error fetching event', error);
        }
    };

    const fetchComments = async () => {
        try {
            const response = await axios.get(`${api}/Comments`);
            const commentsData = response.data.filter(c => c.eventId === event.eventId);
            setComments(commentsData);
    
            // Fetch user information based on userId
            const userIds = commentsData.map(comment => comment.userId);
            const uniqueUserIds = Array.from(new Set(userIds)); // Get unique user IDs
            const usersResponse = await Promise.all(
                uniqueUserIds.map(userId => axios.get(`${api}/Users/${userId}`))
            );
            const usersData = usersResponse.reduce((acc, res) => {
                acc[res.data.userId] = res.data;
                return acc;
            }, {});
            setUsers(usersData);
        } catch (error) {
            console.log('Error fetching comments', error);
        }
    };

    // const fetchParticipants = async () => {
    //     try {
    //         const response = await axios.get(`${api}/UserEvents/GetUsersByEventId/${event.eventId}`);
    //         const userIds = response.data;
    //         const usersResponse = await Promise.all(
    //             userIds.map(userId => axios.get(`${api}/Users/${userId}`))
    //         );
    //         const participantsData = usersResponse.map(res => res.data);
    //         setParticipants(participantsData);
    //     } catch (error) {
    //         console.log('Error fetching participants', error);
    //     }
    // };
    const fetchParticipants = async () => {
        try {
            const response = await axios.get(`${api}/UserEvents/GetUsersByEventId/${event.eventId}`);
            const userIds = response.data;
            const usersResponse = await Promise.all(
                userIds.map(userId => axios.get(`${api}/Users/${userId}`)
                    .then(response => response.data)
                    .catch(error => {
                        console.log(`Error fetching user with ID ${userId}:`, error);
                        return null; // Return null for users that don't exist
                    })
                )
            );
            
            // Filter out null values (users that don't exist)
            const participantsData = usersResponse.filter(user => user !== null);
            
            setParticipants(participantsData);
        } catch (error) {
            console.log('Error fetching participants', error);
        }
    };
    
    
    const handleInputChange = (event) => {
        setNewComment(event.target.value);
    };

    const handleAddComment = () => {
        setShowInput(!showInput); // Toggle showInput state to show/hide the input field
        if (showInput) {
            setNewComment(''); // Reset the new comment input field if canceling
        }
    };

    const getCurrentUserId = () => {
        return parseInt(localStorage.getItem('userId'),10);
    }

    const handleSubmit = async () => {
        // Submit the new comment to the backend
        try {
            const userId = getCurrentUserId(); 
            await axios.post(`${api}/Comments`, {
                content: newComment,
                userId: userId,
                eventId: event.eventId
            });
    
            // After successfully submitting the comment, refetch the comments to update the UI
            await fetchComments();
    
            // Reset the new comment input field
            setNewComment('');
            // Hide the input field
            setShowInput(false);
        } catch (error) {
            console.log('Error submitting comment', error);
        }
    };

    const handleDeleteComment = async (commentId) => {
        // Delete the comment with the given commentId
        try {
            await axios.delete(`${api}/Comments/${commentId}`);
            await fetchComments();
        } catch (error) {
            console.log('Error deleting comment', error);
        }
    };

    return (
        <div>
            <button onClick={() => navigate(-1)}>Back</button>
            {event ? (
                <div>
                    <h1>Event: {event.eventName}</h1>
                    <p>Organizer: {event.organizer}</p>
                    <p>About: {event.eventDescription}</p>
                    <p>Participants: </p>
                    <ul>
                        {participants.map(participant => (
                            <li key={participant.userId}>
                                <Link to={`/profile/${encodeURIComponent(participant.userName)}`}>{participant.userName}</Link>
                            </li>
                        ))}
                    </ul>
                    <div className="comments-container">
                        <p>Comments:</p>
                        <button onClick={handleAddComment}>{showInput ? 'Cancel' : 'Add comment'}</button>
                        {showInput && (
                            <div>
                                <input type="text" value={newComment} onChange={handleInputChange} />
                                <button onClick={handleSubmit}>Submit</button>
                            </div>
                        )}
                        {comments && comments.map(comment => (
                            <div key={comment.commentId} className="comment-box">
                                <h4 className="username">
                                    <Link to={`/profile/${encodeURIComponent(users[comment.userId]?.userName || 'Unknown User')}`}>
                                        {users[comment.userId]?.userName || 'Unknown User'}
                                    </Link>
                                    :
                                </h4>
                                <p>{comment.content}</p>
                                {comment.userId === getCurrentUserId() && (
                                        <button onClick={() => handleDeleteComment(comment.commentId)} style={{marginLeft: '10px'}}>
                                            Delete
                                        </button>
                                    )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
}

export default Event;
