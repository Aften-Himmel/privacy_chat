## Menu Tree Diagram

The following Mermaid diagram represents the complete navigation and menu structure of the Privacy Chat application, showing all routes, screens, and in-page action menus available to the user.

```mermaid
flowchart TD
    A([Privacy Chat]) --> B[/login]
    A --> C[/register]
    A --> D[/forgot-password]
    A --> E[/chat]

    B --> B1[Email Field]
    B --> B2[Password Field]
    B --> B3[Login Button]
    B --> B4[Go to Register]
    B --> B5[Forgot Password Link]

    C --> C1[Username Field]
    C --> C2[Email Field]
    C --> C3[Password Field]
    C --> C4[Send OTP Button]
    C --> C5[OTP Verification Field]
    C --> C6[Register Button]
    C --> C7[Go to Login]

    D --> D1[Enter Email]
    D --> D2[Send Recovery OTP]
    D --> D3[Enter OTP]
    D --> D4[Enter New Password]
    D --> D5[Reset Password Button]

    E --> F[Sidebar]
    E --> G[/chat/:userId - DM Chat Window]
    E --> H[/chat/group/:groupId - Group Chat Window]
    E --> I[/chat/profile - Profile Page]

    F --> F1[Search Bar - Find Users]
    F --> F2[Contacts List]
    F --> F3[Groups List]
    F --> F4[Notification Bell]
    F --> F5[Theme Toggle - Light / Dark]
    F --> F6[Profile Avatar Button]
    F --> F7[Logout Button]

    F4 --> F4A[Notification Panel]
    F4A --> F4B[Message Notifications]
    F4A --> F4C[Invitation Notifications]
    F4A --> F4D[Private Session Alerts]

    F2 --> F2A[Contact Entry]
    F2A --> F2B[Unread Badge Count]
    F2A --> F2C[Online Status Dot]
    F2A --> F2D[Open DM Chat]

    F3 --> F3A[Group Entry]
    F3A --> F3B[Open Group Chat]

    G --> G1[Message List]
    G --> G2[Message Input Box]
    G --> G3[File Upload Button]
    G --> G4[Send Button]
    G --> G5[Chat Header Menu]
    G --> G6[Private Session Banner]

    G5 --> G5A[View Contact Info]
    G5 --> G5B[Start Private Session]
    G5 --> G5C[Remove Contact]

    G6 --> G6A[End Private Session]

    G1 --> G1A[Message Actions - Hover]
    G1A --> G1B[Delete for Me]
    G1A --> G1C[Delete for Everyone]

    H --> H1[Group Message List]
    H --> H2[Message Input Box]
    H --> H3[File Upload Button]
    H --> H4[Send Button]
    H --> H5[Group Header Menu]
    H --> H6[Group Private Session Banner]

    H5 --> H5A[Group Info]
    H5 --> H5B[Members List]
    H5 --> H5C[Add Member - Admin Only]
    H5 --> H5D[Remove Member - Admin Only]
    H5 --> H5E[Edit Group Name and Avatar - Admin Only]
    H5 --> H5F[Start Group Private Session - Admin Only]
    H5 --> H5G[Leave Group]
    H5 --> H5H[Delete Group - Creator Only]

    H6 --> H6A[End Group Private Session]

    I --> I1[Avatar Upload]
    I --> I2[Change Username]
    I --> I3[Change Password]
    I --> I4[Send Contact Invitation]
    I --> I5[Manage Invitations]

    I5 --> I5A[Accept Invitation]
    I5 --> I5B[Decline Invitation]
    I5 --> I5C[View Pending Sent Invitations]
```
